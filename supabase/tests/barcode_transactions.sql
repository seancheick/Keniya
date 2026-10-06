-- Scratch database regression: every write is rolled back by the sentinel.
do $$
declare
  product public.products; version public.product_versions; updated public.products;
  pjson jsonb; vjson jsonb; blocked boolean; packid uuid; edit jsonb;
begin
  insert into public.products(name,upc,barcode_status,barcode_sources,barcode_checked_at)
    values('Transaction fixture','036000291452','verified','[{"source":"package"}]',now()) returning * into product;
  insert into public.product_versions(product_id,calories,unit_wt_oz,verified_at,verified_by)
    values(product.id,100,1,current_date,'Tester') returning * into version;
  pjson := to_jsonb(product); vjson := to_jsonb(version);

  -- Failed version insert must roll back metadata and closing the old formula.
  blocked := false;
  begin
    perform public.save_product(product.id,pjson || '{"name":"Should roll back"}',vjson || '{"unit_wt_oz":-1}',
      'Tester',true,product.updated_at,null,null);
  exception when check_violation then blocked := true; end;
  assert blocked,'invalid version was accepted';
  assert (select name='Transaction fixture' from public.products where id=product.id),'metadata survived failed formula save';
  assert (select is_current from public.product_versions where id=version.id),'current formula closed after failed insert';

  -- An identity change erases provenance and label/clinical attestation together.
  perform public.save_product(product.id,pjson || '{"upc":"042100005264"}',vjson,
    'Tester',false,product.updated_at,null,null);
  select * into updated from public.products where id=product.id;
  assert updated.barcode_status='unverified' and updated.barcode_sources='[]' and updated.barcode_checked_at is null,
    'barcode edit retained provenance';
  assert updated.status='Candidate' and updated.clinical_decision='pending' and updated.approval_role is null,
    'barcode edit retained clinical approval';
  assert (select verified_at is null and verified_by is null from public.product_versions where id=version.id),
    'barcode edit retained label verification';
  assert not exists(select 1 from public.barcode_identities where gtin14='00036000291452'),'old identity leaked';

  blocked := false;
  begin update public.products set upc='012345678906',barcode_status='verified' where id=product.id;
    -- Changing UPC resets provenance; attempting to verify the invalid new UPC must fail.
    update public.products set barcode_status='verified' where id=product.id;
  exception when raise_exception then blocked:=true; end;
  assert blocked,'invalid unit GS1 was verified';
  blocked := false;
  begin insert into public.purchase_packs(product_id,gtin,units_per_pack,barcode_status)
    values(product.id,'012345678906',10,'verified');
  exception when raise_exception then blocked:=true; end;
  assert blocked,'invalid outer GS1 was verified';

  -- Package expiry is recorded for the checked package, never a formula P9 PASS.
  select * into product from public.products where id=product.id;
  select * into version from public.product_versions where id=version.id;
  perform public.verify_product_package(product.id,product.updated_at,to_jsonb(version),'042100005264','unit',null,'Tester',current_date+100);
  assert (select verified_at is not null and pregnancy_checks->>'P8'='PASS' and not (pregnancy_checks ? 'P9') from public.product_versions where id=version.id),
    'verification stored formula-level expiry';

  -- New receiving outer identity cannot become the unit UPC and is unverified until checked.
  pjson := pjson || '{"upc":null,"code":null,"name":"New outer product"}';
  packid := public.save_product(null,pjson,vjson,'Tester',false,null,'012345678905',10);
  assert (select upc is null from public.products where id=packid),'receiving assigned outer barcode as unit';
  assert (select barcode_status='candidate' from public.purchase_packs where product_id=packid),'receiving skipped package verification';
  select * into product from public.products where id=packid;
  select * into version from public.product_versions where product_id=packid and is_current;
  perform public.verify_product_package(product.id,product.updated_at,to_jsonb(version),'012345678905',null,null,'Tester',current_date+100);
  assert (select upc is null from public.products where id=packid),'verification assigned outer barcode as unit';
  assert (select barcode_status='verified' from public.purchase_packs where product_id=packid),'outer package did not verify';

  -- Price, vendor and audit-note edits do not revoke identity/label conclusions.
  select * into product from public.products where id=packid;
  select * into version from public.product_versions where product_id=packid and is_current;
  update public.products set status='Approved',clinical_decision='approved',approval_role='clinician',diligence_status='complete',
    reviewed_by='Laurie',reviewed_at=now(),prescreened_by='Tester',prescreened_at=now() where id=packid;
  select * into product from public.products where id=packid;
  perform public.save_product(packid,to_jsonb(product) || '{"retail_cents":500,"notes":"Pricing correction"}',to_jsonb(version),
    'Tester',false,product.updated_at,null,null);
  assert (select status='Approved' and clinical_decision='approved' from public.products where id=packid),'pricing edit revoked clinical conclusion';
  assert (select verified_at is not null from public.product_versions where id=version.id),'pricing edit revoked label check';

  -- Each material identity/category edit revokes both approval and label verification.
  for edit in select value from jsonb_array_elements('[{"name":"Different variant"},{"brand":"Different brand"},{"categories":["Nut / seed"]}]'::jsonb) loop
    update public.product_versions set verified_at=current_date,verified_by='Tester' where id=version.id;
    update public.products set status='Approved',clinical_decision='approved',approval_role='clinician',diligence_status='complete',
      reviewed_by='Laurie',reviewed_at=now(),prescreened_by='Tester',prescreened_at=now() where id=packid;
    select * into product from public.products where id=packid;
    select * into version from public.product_versions where product_id=packid and is_current;
    perform public.save_product(packid,to_jsonb(product) || edit,to_jsonb(version),'Tester',false,product.updated_at,null,null);
    assert (select status='Candidate' and clinical_decision='pending' and diligence_status='candidate' and reviewed_by is null from public.products where id=packid),
      'material identity edit retained clinical conclusion';
    assert (select verified_at is null and verified_by is null from public.product_versions where id=version.id),'material identity edit retained label check';
  end loop;

  -- A discovered mismatch is not merely a timestamp edit: all conclusions are revoked.
  update public.product_versions set verified_at=current_date,verified_by='Tester' where id=version.id;
  update public.products set status='Approved',clinical_decision='approved',approval_role='clinician',diligence_status='complete',
    reviewed_by='Laurie',reviewed_at=now(),prescreened_by='Tester',prescreened_at=now() where id=packid;
  select * into product from public.products where id=packid;
  select * into version from public.product_versions where id=version.id;
  perform public.invalidate_package_check(packid,product.updated_at,to_jsonb(version),false,'Tester','nutrition panel differs');
  assert (select status='Candidate' and clinical_decision='pending' and approval_role is null and diligence_status='candidate'
    and reviewed_by is null and reviewed_at is null and prescreened_by is null and prescreened_at is null from public.products where id=packid),
    'observed nutrition/ingredient mismatch retained diligence or clinical approval';
  assert (select verified_at is null and verified_by is null from public.product_versions where id=version.id),'observed mismatch retained label verification';
  assert (select notes like '%nutrition panel differs%' from public.products where id=packid),'observed mismatch lacks audit record';
  -- Legacy/direct writes cannot retain label verification or clinical evidence.
  update public.product_versions set verified_at=current_date,verified_by='Tester' where id=version.id;
  update public.products set status='Approved',clinical_decision='approved',approval_role='clinician',diligence_status='complete',
    reviewed_by='Laurie Pham',reviewed_at=now(),prescreened_by='Tester',prescreened_at=now() where id=packid;
  update public.products set name='Direct corrected identity' where id=packid;
  assert (select status='Candidate' and reviewed_at is null from public.products where id=packid),'direct metadata correction retained approval';
  assert (select verified_at is null from public.product_versions where id=version.id),'direct identity correction retained label check';
  update public.product_versions set verified_at=current_date,verified_by='Tester' where id=version.id;
  update public.product_versions set calories=calories+1,pregnancy_checks=pregnancy_checks || '{"P9":"PASS"}' where id=version.id;
  assert (select verified_at is null and not pregnancy_checks ? 'P9' from public.product_versions where id=version.id),'direct formula correction retained label/P9';
  update public.product_versions set verified_at=current_date,verified_by='Tester' where id=version.id;
  assert public.product_package_verified(packid),'verified outer identity not recognized';
  update public.purchase_packs set units_per_pack=units_per_pack+1 where product_id=packid;
  assert not public.product_package_verified(packid),'outer pack count correction retained verified provenance';
  raise exception 'BARCODE_TRANSACTIONS_PASSED';
end $$;
