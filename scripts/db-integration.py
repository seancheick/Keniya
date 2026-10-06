#!/usr/bin/env python3
"""Apply migrations and run integration tests in an EMPTY local scratch PostgreSQL database.

DATABASE_URL must name a local database starting keneya_test_. Never loads .env or
contacts Supabase. Set PSQL to a full executable path if psql is not on PATH.
"""
import concurrent.futures
import os
from pathlib import Path
import subprocess
from urllib.parse import urlparse
import uuid

ROOT = Path(__file__).resolve().parent.parent
url = os.environ.get('DATABASE_URL', '')
parsed = urlparse(url)
if parsed.scheme not in ('postgres', 'postgresql') or parsed.hostname not in ('localhost', '127.0.0.1', '::1') or not parsed.path.startswith('/keneya_test_'):
    raise SystemExit('DATABASE_URL must point to an empty local keneya_test_* database.')
PSQL = os.environ.get('PSQL', 'psql')


def query(sql):
    return subprocess.run([PSQL, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', url], input=sql, capture_output=True, text=True)


def require(sql):
    result = query(sql)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def apply(file, sentinel=None):
    result = query(file.read_text())
    if sentinel:
        # Sentinels deliberately roll back an entire DO transaction. All other errors fail.
        passed = result.returncode != 0 and f'ERROR:  {sentinel}\n' in result.stderr
    else:
        passed = result.returncode == 0
    if not passed:
        raise RuntimeError(f'{file.relative_to(ROOT)}: {result.stderr}')
    print(f'PASS {file.relative_to(ROOT)}', flush=True)


if require("select count(*) from pg_tables where schemaname in ('public','storage')") != '0':
    raise SystemExit('Scratch database is not empty; create a fresh keneya_test_* database.')
apply(ROOT / 'scripts/local-stack/stubs.sql')
for file in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
    apply(file)
for file in sorted((ROOT / 'supabase/tests').glob('*.sql')):
    text = file.read_text()
    sentinel = None
    for candidate in ('BARCODE_TESTS_PASSED', 'BARCODE_TRANSACTIONS_PASSED'):
        if f"raise exception '{candidate}'" in text:
            sentinel = candidate
    apply(file, sentinel)

# Real concurrent transactions: one global GTIN cannot identify both unit and outer pack.
tag = uuid.uuid4().hex
product = require(f"insert into products(name) values('concurrency {tag}') returning id")
unit = "begin; insert into products(name,upc) values('Race unit','96385074'); select pg_sleep(0.15); commit;"
pack = f"begin; insert into purchase_packs(product_id,gtin,units_per_pack) values('{product}','00000096385074',6); select pg_sleep(0.15); commit;"
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(query, (unit, pack)))
assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
assert any('duplicate key' in r.stderr for r in results), [r.stderr for r in results]
print('PASS concurrent cross-table barcode collision', flush=True)

# More buyers than slots: advisory lock/unique persistence arbitrate capacity atomically.
slug = 'race_' + tag
sale_product = require("insert into products(name) values('Capacity race') returning id")
require(f"""insert into product_versions(product_id,nutrition_source,ingredients,allergens,unit_wt_oz,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,pregnancy_checks)
values('{sale_product}','Label','Almonds','Tree nuts',1,100,5,3,10,0,0,0,0,0,'{{"P1":"PASS","P2":"PASS","P3":"PASS","P4":"PASS","P5":"PASS","P6":"PASS","P7a":"PASS","P7b":"PASS","P8":"PASS"}}');
select set_product_review('{sale_product}','Pre-approved',null,'Sean','admin');
select set_product_review('{sale_product}','Approved',null,'Laurie Pham','clinician');
insert into box_rules(box_slug,rules) values('{slug}','{{}}');
update admin_settings set data=jsonb_build_object('runSize',jsonb_build_object('{slug}',3),'prices',jsonb_build_object('{slug}',4700)) where id=1;""")
sale_lineup = require(f"insert into box_lineups(box_slug,version,status) values('{slug}',1,'active') returning id")
require(f"insert into lineup_items(lineup_id,position,product_id) values('{sale_lineup}',1,'{sale_product}')")

def reserve(index):
    return query(f"select reserve_checkout('{uuid.uuid4()}','{slug}',3,'f{index}','c{index}','{sale_lineup}','{{}}',4700,(select data from admin_settings where id=1))")

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(reserve, range(8)))
assert sum(r.returncode == 0 for r in results) == 3, [r.stderr for r in results]
assert all(r.returncode == 0 or 'Founding run sold out' in r.stderr for r in results), [r.stderr for r in results]
assert require(f"select count(*) from checkout_reservations where box_slug='{slug}'") == '3'
print('PASS concurrent founding-cap reservations', flush=True)

# Two packers contend for one physical serving: exactly one deducts it.
pid = require(f"insert into products(name,upc,barcode_status) values('Stock race {tag}','042100005264','verified') returning id")
vid = require(f"""insert into product_versions(product_id,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,unit_wt_oz,ingredients,allergens,nutrition_source,pregnancy_checks,verified_at,verified_by)
values('{pid}',100,5,3,10,0,0,0,0,0,1,'Almonds','Tree nuts','Physical label','{{"P1":"PASS","P2":"PASS","P3":"PASS","P4":"PASS","P5":"PASS","P6":"PASS","P7a":"PASS","P7b":"PASS","P8":"PASS"}}',current_date,'Sean') returning id""")
require(f"select set_product_review('{pid}','Pre-approved',null,'Sean','admin'); select set_product_review('{pid}','Approved',null,'Laurie Pham','clinician');")
lot = require(f"insert into purchase_lots(product_id,product_version_id,qty,qty_remaining,total_paid_cents,expires_on) values('{pid}','{vid}',1,1,100,current_date+180) returning id")
ships = [require(f"insert into shipments(box_slug,planned_items) values('heart',array['{pid}'::uuid]) returning id") for _ in range(2)]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(query, [f"select pack_shipment('{ship}','test',0,0,1,0)" for ship in ships]))
assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
assert any('SHORTAGE' in r.stderr for r in results), [r.stderr for r in results]
assert require(f"select qty_remaining from purchase_lots where id='{lot}'") == '0'
print('PASS concurrent stock packing', flush=True)
print('All scratch database integration tests passed.', flush=True)
