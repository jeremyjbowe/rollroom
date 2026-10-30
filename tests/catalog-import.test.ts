import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Conflict,type JsonStorage} from '../lib/atomic-store.ts';
import {previewImport,loadImportWorkbook} from '../lib/inventory-import.ts';
import {commitCatalogImport} from '../lib/catalog-import.ts';
import {listProducts,saveProduct} from '../lib/products.ts';
import {readInventory} from '../lib/inventory.ts';
class Memory implements JsonStorage{data=new Map<string,{value:unknown;etag:string}>();revision=0;failInventory=false;async read<T>(p:string){const d=this.data.get(p);return d?structuredClone(d) as {value:T;etag:string}:null;}async write<T>(p:string,v:T,etag:string|null){if(this.failInventory&&p==='inventory/catalog.json')throw Error('outage');if((this.data.get(p)?.etag??null)!==etag)throw new Conflict();this.data.set(p,{value:structuredClone(v),etag:String(++this.revision)});}}
const date='2026-10-30',loc='dtp-vegas';
const sample=['New vinyl','00123',3.61,6,54,3,22,'B2','Clean'];
async function file(rows:unknown[][]){const w=await loadImportWorkbook(await readFile(new URL('../assets/templates/rollroom-product-inventory-worksheet.xlsx',import.meta.url)));rows.forEach((r,i)=>r.forEach((v,j)=>{w.worksheets[0].getCell(i+7,j+2).value=v as any;}));return new Uint8Array(await w.xlsx.writeBuffer());}
async function preview(db:Memory,rows:unknown[][]){const p=await previewImport(db,await file(rows),loc,date);assert.equal(p.mode,'catalog');if(p.mode!=='catalog')throw Error('wrong mode');return p;}
test('actual setup workbook creates products, quantities and product-only rows with distinct QR identities',async()=>{
 const db=new Memory(),p=await preview(db,[sample,['Catalog only','CAT',3.5,8,'',0,'','','']]);
 assert.equal(p.canImport,true);assert.equal(p.productCount,2);assert.equal(p.rollCount,3);assert.equal((await listProducts(db)).length,0);
 const rolls=await commitCatalogImport(db,p.rows,loc,date,p.digest);assert.equal(rolls.length,3);assert.equal(new Set(rolls.map(r=>r.id)).size,3);assert.equal(new Set(rolls.map(r=>r.label)).size,3);assert.ok(rolls.every(r=>r.feet===22&&r.widthIn===54));
 const products=await listProducts(db);assert.equal(products.length,2);assert.equal(products.find(p=>p.name==='New vinyl')?.sku,'00123');assert.equal(products[0].measuredAt,date);
 const replay=await preview(db,[sample,['Catalog only','CAT',3.5,8,'',0,'','','']]);assert.equal(replay.digest,p.digest);assert.equal(replay.duplicate,true);assert.equal(replay.productCount,0);
 const nextDay=await previewImport(db,await file([sample,['Catalog only','CAT',3.5,8,'',0,'','','']]),loc,'2026-10-31');assert.equal(nextDay.duplicate,true);
 await assert.rejects(commitCatalogImport(db,p.rows,loc,date,p.digest),/already/);
});
test('repeated product rows reuse one product and create rolls at their own lengths',async()=>{const db=new Memory(),p=await preview(db,[sample,['New vinyl','00123',3.61,6,48,1,50,'C1','']]);assert.equal(p.productCount,1);assert.equal(p.rollCount,4);const r=await commitCatalogImport(db,p.rows,loc,date,p.digest);assert.equal((await listProducts(db)).length,1);assert.deepEqual(r.map(r=>r.feet),[22,22,22,50]);});
test('invalid measurements, quantities, conflicting products and formulas block all writes',async()=>{
 for(const change of [{2:0},{3:251},{5:1.5},{5:-1},{4:''},{6:''},{2:{formula:'1+2',result:3}}]){const row=[...sample] as unknown[];for(const [k,v]of Object.entries(change))row[Number(k)]=v;const db=new Memory(),p=await preview(db,[row]);assert.equal(p.canImport,false);await assert.rejects(commitCatalogImport(db,p.rows,loc,date,p.digest));assert.equal(db.data.size,0);}
 const db=new Memory();const p=await preview(db,[sample,['New vinyl','00123',4,6,54,1,22,'','']]);assert.equal(p.canImport,false);
 await saveProduct(db,{name:'New vinyl',sku:'00123',coreIn:4,thicknessMil:6,notes:'',measuredAt:date});assert.equal((await preview(db,[sample])).canImport,false);
 await assert.rejects(preview(db,[[...sample.slice(0,5),201,...sample.slice(6)]]),/quantity/);
});
test('retry after product save and inventory failure reuses products and completes rolls once',async()=>{const db=new Memory(),p=await preview(db,[sample]);db.failInventory=true;await assert.rejects(commitCatalogImport(db,p.rows,loc,date,p.digest),/Product setup was saved/);assert.equal((await listProducts(db)).length,1);assert.equal((await readInventory(db)).rolls.length,0);db.failInventory=false;const retry=await preview(db,[sample]);assert.equal(retry.digest,p.digest);assert.equal(retry.canImport,true);await commitCatalogImport(db,retry.rows,loc,date,retry.digest);assert.equal((await listProducts(db)).length,1);assert.equal((await readInventory(db)).rolls.length,3);});
test('concurrent copies of one setup workbook create one product and one roll batch',async()=>{const db=new Memory(),p=await preview(db,[sample]);const results=await Promise.allSettled([commitCatalogImport(db,p.rows,loc,date,p.digest),commitCatalogImport(db,p.rows,loc,date,p.digest)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await listProducts(db)).length,1);assert.equal((await readInventory(db)).rolls.length,3);});
