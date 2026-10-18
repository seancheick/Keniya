import json
d=json.load(open('packet.json'))
BOX={'pregnancy_comfort':'Pregnancy','blood_sugar':'Blood Sugar','heart':'Heart','gestational_diabetes':'Gestational Diabetes','glp1':'GLP-1','postpartum':'Postpartum'}
NOTE={
'P014':'Has chocolate. The label gives no caffeine number; our internal screening estimate is about 16 mg (whole pack counted as dark chocolate). It is never shown to customers as a label value. See question 5.',
'P013':'Palm oil, 3 g saturated fat. Not used in the Heart box. See question 6.',
'P073':'Palm oil, 3.5 g saturated fat. Not used in the Heart box. See question 6.',
'P031':'390 mg sodium, the saltiest pick. Pregnancy and Postpartum have no sodium limit (Keniya policy). If that is too much for these boxes, decline it here.',
'P033':'Ginger tea. See question 1.',
'P034':'Ginger tea, 2 g ginger root per bag (2 bags per pack). See question 1.',
'P025':'Pumpkin seeds (roasted).',
'P078':'Mixed nuts. We will confirm the exact blend on the pouch in hand (one variant contains hazelnuts).',
'P079':'Plain almonds and walnuts. We will confirm the allergen line on the package in hand.',
'P081':'Roasted chickpeas, 6 g protein and 6 g fiber.',
'P035':'Has added vitamin C (as a preservative). See question 2.',
'P036':'Has added vitamin C (as a preservative). See question 2.',
'P089':'Has added vitamin C (as a preservative). See question 2.',
'P076':'Plain "natural" almonds. We will confirm with the maker that they are pasteurized. See question 3.',
'P007':'Roasted almonds.',
'P083':'Baked cheese cracker. See question 4.',
'P084':'Baked cheese cracker, made with pasteurized milk. See question 4.',
'P082':'Dairy-free "cheddar" flavor. We will confirm the allergen line on the package in hand.',
'P077':'We will confirm the allergen line on the package in hand.',
'P098':'28 g carbs, so it is only in boxes with no carb limit (Pregnancy, Heart, Postpartum).',
}
def rnd(p):
  def step(v,s): return abs(v/s-round(v/s))<1e-9
  def gram(v): return v in (0,0.5) if v<1 else step(v,1)
  R=[('cal','Calories','',lambda v: v==0 if v<5 else step(v,5) if v<=50 else step(v,10)),('protein','Protein',' g',gram),('fiber','Fiber',' g',gram),('carbs','Total carbs',' g',gram),('addedSugar','Added sugar',' g',gram),('satFat','Saturated fat',' g',lambda v: v==0 if v<0.5 else step(v,0.5) if v<5 else step(v,1)),('sodium','Sodium',' mg',lambda v: v==0 if v<5 else step(v,5) if v<=140 else step(v,10))]
  return [f"{l} {('%g'%p[k])}{u}" for k,l,u,ok in R if isinstance(p[k],(int,float)) and not ok(p[k])]
def f(x): 
  if x is None: return '?'
  return ('%g'%x)
out=[]
for i,(c,p) in enumerate(sorted(d['products'].items(), key=lambda kv: kv[1]['name'].lower()),1):
  name=p['name']
  out.append(f"### {i}. {name}\n")
  out.append(f"- **Boxes:** {', '.join(BOX[b] for b in p['boxes'])}")
  caf = f"{f(p['caffeine'])} mg" if p['caffeine'] is not None else "not on label"
  out.append(f"- **Per pack ({f(p['oz'])} oz):** {f(p['cal'])} cal · {f(p['protein'])} g protein · {f(p['fiber'])} g fiber · {f(p['carbs'])} g carbs · {f(p['addedSugar'])} g added sugar · {f(p['sodium'])} mg sodium · {f(p['satFat'])} g sat fat · caffeine {caf}")
  out.append(f"- **Ingredients:** {p['ingredients'] or '_not on file yet_'}")
  out.append(f"- **Allergens (label):** {p['allergens'] or '_not on file_'}")
  if c in NOTE: out.append(f"- **Look at:** {NOTE[c]}")
  r=rnd(p)
  if r: out.append(f"- **Calculated, not yet checked on the pack:** {', '.join(r)}. A printed label can't show these exact numbers; we will replace them with the package's values before buying.")
  out.append(f"- **Your decision:** ☐ Approve  ☐ Not approved  ☐ Question: ________\n")
open('products.md','w').write('\n'.join(out))
lu=[]
names={c:p['name'] for c,p in d['products'].items()}
for s,b in d['boxes'].items():
  lu.append(f"**{BOX[s]}** (14 snacks)\n")
  for n,it in enumerate(b['items'],1): lu.append(f"{n}. {names[it['code']]} ({it['category'].lower()})")
  lu.append("\n☐ Approve this box  ☐ Changes needed: ________\n")
open('lineups.md','w').write('\n'.join(lu))
