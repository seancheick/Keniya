import { describe, expect, it } from 'vitest';
import { snack, settings } from './__fixtures__/snacks';
import { eligibleFor } from './rules';
import { optimize } from './optimizer';
import { DEFAULT_BOX_RULES } from './types';
import { publicStandards } from '../standards';
import { packetProductRows } from './clinical-packet';

describe('Blood Sugar and GDM separated snack and hydration gates',()=>{
  for(const slug of ['blood_sugar','gestational_diabetes'] as const){
    const fit=(p:ReturnType<typeof snack>,r=DEFAULT_BOX_RULES[slug])=>eligibleFor(slug,p,r,settings.policy);
    it(`${slug}: 3 g total carbs qualifies with 0–3 g added sugar`,()=>{
      for(const added_sugar_g of [0,1,2,3])expect(fit(snack({type:'Beverage',form:'Powder',protein_g:0,fiber_g:0,carbs_g:3,added_sugar_g,roles:{}})).fits).toBe(true);
    });
    it(`${slug}: beverages cannot bypass the configurable carb ceiling with food roles`,()=>{
      const p=snack({type:'Beverage',form:'Powder',carbs_g:3.01,added_sugar_g:0,roles:{WHOLE_FOOD:true}});
      expect(fit(p).fits).toBe(false);
      expect(fit(p,{...DEFAULT_BOX_RULES[slug],beverageCarbsMax:4}).fits).toBe(true);
      expect(fit({...p,carbs_g:3},{...DEFAULT_BOX_RULES[slug],beverageCarbsMax:2}).fits).toBe(false);
    });
    it(`${slug}: regular snack ceilings are 15 g carbs and 3 g added sugar`,()=>{
      expect(fit(snack({carbs_g:15,added_sugar_g:3})).fits).toBe(true);
      expect(fit(snack({carbs_g:15.01,added_sugar_g:3})).fits).toBe(false);
      expect(fit(snack({carbs_g:15,added_sugar_g:3.01,roles:{CT:true}})).fits).toBe(false);
    });
    it(`${slug}: public hydration copy shares the configured ceiling`,()=>{
      const r={...DEFAULT_BOX_RULES,[slug]:{...DEFAULT_BOX_RULES[slug],beverageCarbsMax:2}};
      expect(publicStandards(slug,r)).toContain('Hydration picks: 2 g total carbs or less per stick.');
      expect(publicStandards(slug,r).join()).not.toContain('must have 0 g added sugar');
    });
    it(`${slug}: zero sugar is only an optimizer preference`,()=>{
      const sugared=snack({code:'P001',type:'Beverage',form:'Powder',carbs_g:3,added_sugar_g:1,categories:['Hydration']});
      const zero=snack({...sugared,id:'zero',code:'P999',added_sugar_g:0});
      const args={slug,rules:{...DEFAULT_BOX_RULES[slug],total:1,categories:[{name:'Hydration',min:1,max:1}],substantialMin:null,proteinOrFiberMin:null,wholeFoodMin:null},settings,snacks:[sugared,zero],objective:'balanced' as const,packagingOz:0};
      expect(optimize(args).picks[0].snack.id).toBe(zero.id);
      expect(optimize({...args,snacks:[sugared]}).picks[0].snack.id).toBe(sugared.id);
    });
  }
  it('GDM still requires every Pregnancy screen and nutrition evidence',()=>{
    const p=snack({type:'Beverage',form:'Powder',carbs_g:3,added_sugar_g:1});
    expect(eligibleFor('gestational_diabetes',{...p,pregnancy_checks:{...p.pregnancy_checks,P7a:''}},DEFAULT_BOX_RULES.gestational_diabetes,settings.policy).fits).toBe(false);
    expect(eligibleFor('blood_sugar',{...p,carbs_g:null},DEFAULT_BOX_RULES.blood_sugar,settings.policy).fits).toBe(false);
    for(const slug of ['heart','glp1'] as const)expect(eligibleFor(slug,p,DEFAULT_BOX_RULES[slug],settings.policy).fits).toBe(false);
  });
  it('Laurie packet excludes unfinished diligence even if rule eligible',()=>{
    expect(packetProductRows({boxes:[{slug:'blood_sugar',version:1,checks:[],picks:[{snack:snack({status:'Candidate',diligenceComplete:false}),category:'Protein'}],extras:[]}],rules:DEFAULT_BOX_RULES,policy:settings.policy,extra:()=>undefined})).toEqual([]);
  });
});
