import type ExcelJS from 'exceljs';
import {createHash,randomUUID} from 'node:crypto';
import {ImportError,cellText,amount,norm,type ImportRow} from './inventory-import.ts';
import {listProducts} from './products.ts';
import {readInventory,type Inventory,type Roll} from './inventory.ts';
import {validateProduct,type Product} from './calculator.ts';
import {updateDocument,type JsonStorage} from './atomic-store.ts';
export type CatalogRow=ImportRow&{coreIn:number;thicknessMil:number;quantity:number;isNew:boolean};
export const catalogHeaders=['#','Material / product name','SKU / shop code','Core OD (in)','Total thickness (mil)','Width (in)','Roll quantity','Usable ft per roll','Rack / bin','Notes / condition'];
const identity=(r:{sku:string;name:string})=>norm(r.sku)?'sku:'+norm(r.sku):'name:'+norm(r.name);
export function catalogDigest(rows:CatalogRow[],locationId:string,measuredAt:string){return createHash('sha256').update(JSON.stringify(['catalog-v1',locationId,rows.map(r=>JSON.stringify([norm(r.name),norm(r.sku),r.coreIn,r.thicknessMil,r.quantity,r.widthIn,r.feet,r.bin,r.notes])).sort()])).digest('hex');}
function matchProduct(products:Product[],r:{name:string;sku:string;coreIn:number;thicknessMil:number}){
 const matches=products.filter(p=>r.sku?norm(p.sku)===norm(r.sku):norm(p.name)===norm(r.name));
 if(matches.length>1)throw new ImportError('Multiple products match. Use a unique SKU or resolve duplicates in Admin.');
 const p=matches[0];
 if(p&&(!p.active||norm(p.name)!==norm(r.name)||norm(p.sku)!==norm(r.sku)||p.coreIn!==r.coreIn||p.thicknessMil!==r.thicknessMil))throw new ImportError('Existing product details differ. Correct the sheet or edit that product in Admin first.');
 if(!p&&products.some(p=>norm(p.name)===norm(r.name)))throw new ImportError('This product name already exists with a different SKU. Use its current SKU or a distinct product name.');
 return p;
}
export async function previewCatalogImport(storage:JsonStorage,sheet:ExcelJS.Worksheet,header:number,locationId:string,measuredAt:string){
 if(catalogHeaders.some((h,i)=>norm(sheet.getCell(header,i+1).text)!==norm(h)))throw new ImportError('Keep the product setup worksheet headers unchanged.');
 try{validateProduct({name:'Date check',sku:'',notes:'',coreIn:1,thicknessMil:1,measuredAt});}catch{throw new ImportError('Choose a valid measurement date.');}
 const [products,inventory]=await Promise.all([listProducts(storage),readInventory(storage)]);
 const location=inventory.locations.find(l=>l.id===locationId&&l.active);if(!location)throw new ImportError('Choose an active location.');
 const rows:CatalogRow[]=[],seen=new Map<string,CatalogRow>();
 for(let i=header+1;i<=sheet.rowCount;i++){
  if(/^quantity means/i.test(sheet.getCell(i,1).text))break;
  const errors:string[]=[];
  const cells=Array.from({length:9},(_,j)=>{try{return cellText(sheet.getCell(i,j+2).value);}catch(e){errors.push((e as Error).message);return '';}});
  if(!errors.length&&cells.every(v=>!v))continue;
  const [name,sku,core,thickness,width,qty,feet,bin,notes]=cells;
  const coreIn=amount(core,30),thicknessMil=amount(thickness,250);
  const quantity=qty===''?0:/^\d+$/.test(qty)?Number(qty):NaN;
  const widthIn=width?amount(width,1000):0,length=feet?amount(feet,1000000):0;
  try{validateProduct({name,sku,coreIn,thicknessMil,measuredAt,notes:''});}catch(e){errors.push((e as Error).message);}
  if(!Number.isInteger(quantity)||quantity<0||quantity>200)errors.push('Roll quantity must be a whole number from 0 to 200.');
  if(quantity>0&&(!widthIn||!length))errors.push('Enter positive width and usable feet per roll when quantity is greater than 0.');
  if(!Number.isFinite(widthIn)||!Number.isFinite(length))errors.push('Width and usable footage must be valid positive numbers.');
  if(quantity===0&&(width||feet||bin||notes))errors.push('Enter a roll quantity, or leave width, footage, rack and notes blank for a product-only row.');
  if(bin.length>80||notes.length>300)errors.push('Rack/bin allows 80 characters and roll notes allow 300.');
  let p:Product|undefined;try{p=matchProduct(products,{name,sku,coreIn,thicknessMil});}catch(e){errors.push((e as Error).message);}
  const row:CatalogRow={row:i,name,sku,coreIn:coreIn||0,thicknessMil:thicknessMil||0,quantity:Number.isFinite(quantity)?quantity:0,widthIn:widthIn||0,feet:length||0,bin,notes,productId:p?.id||'',isNew:!p,errors};
  const key=identity(row),prior=seen.get(key);
  if(prior&&(norm(prior.name)!==norm(name)||prior.coreIn!==row.coreIn||prior.thicknessMil!==row.thicknessMil||norm(prior.sku)!==norm(sku)))errors.push(`Product measurements or name disagree with row ${prior.row}.`);
  // A name with conflicting SKU identities is ambiguous, even within this upload.
  if(rows.some(r=>norm(r.name)===norm(name)&&identity(r)!==key))errors.push('The same product name has different SKUs in this sheet.');
  seen.set(key,row);rows.push(row);
 }
 if(!rows.length)throw new ImportError('No completed rows found. Enter product details below the headers.');
 if(rows.length>200)throw new ImportError('Import up to 200 worksheet rows at a time.');
 const rollCount=rows.reduce((n,r)=>n+r.quantity,0),productCount=new Set(rows.filter(r=>r.isNew).map(identity)).size;
 if(rollCount>200)throw new ImportError('The total roll quantity must be 200 or fewer per upload.');
 if(products.length+productCount>1000)throw new ImportError('The product limit of 1,000 would be exceeded.');
 if(inventory.rolls.length+rollCount>10000)throw new ImportError('The inventory limit of 10,000 rolls would be exceeded.');
 const digest=catalogDigest(rows,locationId,measuredAt),duplicate=(inventory.importKeys??[]).includes(digest);
 return {mode:'catalog' as const,rows,location,measuredAt,digest,duplicate,productCount,rollCount,canImport:!duplicate&&rows.every(r=>!r.errors.length)};
}
export async function commitCatalogImport(storage:JsonStorage,rows:CatalogRow[],locationId:string,measuredAt:string,digest:string){
 if(!rows.length||rows.some(r=>r.errors.length)||digest!==catalogDigest(rows,locationId,measuredAt))throw new ImportError('Preview the worksheet again.');
 const current=await readInventory(storage);
 if((current.importKeys??[]).includes(digest))throw new ImportError('This worksheet has already been imported.');
 if(!current.locations.some(l=>l.id===locationId&&l.active))throw new ImportError('Choose an active location.');
 const count=rows.reduce((n,r)=>n+r.quantity,0);
 if(count>200||current.rolls.length+count>10000)throw new ImportError('The roll limit would be exceeded.');
 // Product creation is idempotent. If the inventory write fails, retrying the same
 // sheet reuses these products; rolls and the duplicate marker commit together.
 const resolved=await updateDocument<Product[],Map<string,Product>>(storage,'products/catalog.json',[],products=>{
  const next=[...products],mapping=new Map<string,Product>();
  for(const row of rows){let p=matchProduct(next,row);if(!p){const fields=validateProduct({name:row.name,sku:row.sku,coreIn:row.coreIn,thicknessMil:row.thicknessMil,measuredAt,notes:''});p={...fields,id:randomUUID()};next.push(p);}mapping.set(identity(row),p);}
  if(next.length>1000)throw new ImportError('The product limit of 1,000 would be exceeded.');
  return {value:next,result:mapping};
 });
 try{return await updateDocument<Inventory,Roll[]>(storage,'inventory/catalog.json',current,data=>{
  if((data.importKeys??[]).includes(digest))throw new ImportError('This worksheet has already been imported. No duplicate rolls were added.');
  if(!data.locations.some(l=>l.id===locationId&&l.active))throw new ImportError('The location is no longer active.');
  if(data.rolls.length+count>10000)throw new ImportError('The inventory limit of 10,000 rolls would be exceeded.');
  const labels=new Set(data.rolls.map(r=>r.label)),created:Roll[]=[],now=new Date().toISOString();
  for(const row of rows){const p=resolved.get(identity(row))!;for(let n=0;n<row.quantity;n++){let label;do{label=`RR-${randomUUID().slice(0,8).toUpperCase()}`;}while(labels.has(label));labels.add(label);created.push({id:randomUUID(),label,productId:p.id,productName:p.name,sku:p.sku,widthIn:row.widthIn,feet:row.feet,locationId,bin:row.bin,notes:row.notes,status:'available',createdAt:now,updatedAt:now});}}
  return {value:{...data,rolls:[...data.rolls,...created],importKeys:[...(data.importKeys??[]),digest]},result:created};
 });}catch(e){if(e instanceof ImportError&&/already been imported/.test(e.message))throw e;throw new ImportError('Product setup was saved, but the roll import could not be confirmed. Preview and retry this same file; existing products will be reused and an already-saved batch will be blocked.');}
}
