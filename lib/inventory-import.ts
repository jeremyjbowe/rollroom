import ExcelJS from 'exceljs';
import {previewCatalogImport} from './catalog-import.ts';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {createHash,randomUUID} from 'node:crypto';
import {listProducts} from './products.ts';
import {readInventory,type Roll,type Inventory} from './inventory.ts';
import {updateDocument,type JsonStorage} from './atomic-store.ts';
export class ImportError extends Error{}
export type ImportRow={row:number;name:string;sku:string;widthIn:number;feet:number;bin:string;notes:string;productId:string;errors:string[]};
export const norm=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
export function cellText(v:ExcelJS.CellValue){if(v===null||v===undefined)return '';if(typeof v==='string'||typeof v==='number')return String(v).trim();if(typeof v==='object'&&'richText' in v)return v.richText.map(x=>x.text).join('').trim();throw new ImportError('Use typed values, not formulas, links, dates or errors, in inventory rows.');}
export function amount(s:string,max:number){if(!/^\d+(\.\d+)?$/.test(s))return NaN;const n=Number(s);return n>0&&n<=max?n:NaN;}
export function importDigest(rows:ImportRow[],locationId:string){const canonical=rows.map(r=>JSON.stringify([r.productId,r.widthIn,r.feet,r.bin,r.notes])).sort();return createHash('sha256').update(JSON.stringify([locationId,canonical])).digest('hex');}
export async function loadImportWorkbook(bytes:Uint8Array){
 if(bytes.length>2*1024*1024)throw new ImportError('Choose an Excel file smaller than 2 MB.');
 let total=0,count=0;try{unzipSync(bytes,{filter:f=>{total+=f.originalSize;count++;if(total>8*1024*1024||count>500)throw new Error('size');if(/vbaProject|externalLinks/i.test(f.name))throw new Error('unsupported');return false;}});}catch{throw new ImportError('Use a standard .xlsx worksheet under 2 MB, without macros or external links.');}
 // Some spreadsheet writers use an explicit prefix for the main XML namespace.
 // ExcelJS expects unprefixed element names; normalize only that namespace.
 const files=unzipSync(bytes);
 for(const name of Object.keys(files)){if(!name.endsWith('.xml'))continue;let xml=strFromU8(files[name]);const declaration=/xmlns:([A-Za-z_][\w.-]*)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/;const match=xml.match(declaration);if(match){const prefix=match[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');xml=xml.replace(declaration,'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(new RegExp('(<\\/?)'+prefix+':','g'),'$1');files[name]=strToU8(xml);}}
 const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(new Uint8Array(zipSync(files)).buffer);}catch{throw new ImportError('Unable to read this Excel file. Use the downloaded .xlsx template.');}
 return workbook;
}
export async function previewImport(storage:JsonStorage,bytes:Uint8Array,locationId:string,measuredAt=new Date().toISOString().slice(0,10)){
 const workbook=await loadImportWorkbook(bytes);
 if(workbook.worksheets.length!==1)throw new ImportError('Upload one worksheet at a time. Save each location or sheet in its own Excel file.');
 const sheet=workbook.worksheets[0];if(sheet.rowCount>1000||sheet.columnCount>32)throw new ImportError('This worksheet is too large. Use the Rollroom template.');
 let header=0;for(let i=1;i<=Math.min(sheet.rowCount,20);i++){if(norm(sheet.getCell(i,2).text)==='material / product name'&&norm(sheet.getCell(i,3).text)==='sku / shop code'){header=i;break;}}
 if(header&&norm(sheet.getCell(header,4).text)==='core od (in)')return previewCatalogImport(storage,sheet,header,locationId,measuredAt);
 if(!header||norm(sheet.getCell(header,4).text)!=='width (in)'||!['est. usable length (ft)','usable length (ft, estimated)'].includes(norm(sheet.getCell(header,5).text))||norm(sheet.getCell(header,6).text)!=='rack / bin'||norm(sheet.getCell(header,7).text)!=='roll id (if labeled)'||norm(sheet.getCell(header,8).text)!=='notes / condition')throw new ImportError('The columns do not match the Rollroom worksheet. Download a fresh template and keep its headers.');
 const [products,inventory]=await Promise.all([listProducts(storage),readInventory(storage)]);
 const location=inventory.locations.find(l=>l.id===locationId&&l.active);if(!location)throw new ImportError('Choose an active location.');
 const rows:ImportRow[]=[];
 for(let i=header+1;i<=sheet.rowCount;i++){
  if(/^tag each physical roll/i.test(sheet.getCell(i,1).text))break;
  const errors:string[]=[];const values=Array.from({length:7},(_,j)=>{try{return cellText(sheet.getCell(i,j+2).value);}catch(e){errors.push((e as Error).message);return '';}});
  if(!errors.length&&values.every(v=>!v))continue;
  const [name,sku,width,feet,bin,rollId,notes]=values;
  const active=products.filter(p=>p.active);let matches=sku?active.filter(p=>norm(p.sku)===norm(sku)):active.filter(p=>norm(p.name)===norm(name));
  if(sku&&name)matches=matches.filter(p=>norm(p.name)===norm(name));
  if(matches.length!==1)errors.push(matches.length>1?'More than one material matches. Enter its exact name and SKU.':'No matching active material. Correct the name/SKU or add the product in Admin first.');
  const widthIn=amount(width,1000),length=amount(feet,1000000);
  if(!Number.isFinite(widthIn))errors.push('Width must be a number greater than 0 and at most 1,000 inches.');
  if(!Number.isFinite(length))errors.push('Usable length must be a number greater than 0 and at most 1,000,000 feet.');
  if(rollId)errors.push('Roll ID is filled in. Update existing rolls in Inventory; leave this blank for new rolls.');
  if(bin.length>80)errors.push('Rack/bin must be 80 characters or fewer.');if(notes.length>300)errors.push('Notes must be 300 characters or fewer.');
  rows.push({row:i,name:matches[0]?.name||name,sku:matches[0]?.sku||sku,widthIn:Number.isFinite(widthIn)?widthIn:0,feet:Number.isFinite(length)?length:0,bin,notes,productId:matches.length===1?matches[0].id:'',errors:[...new Set(errors)]});
 }
 if(!rows.length)throw new ImportError('No completed roll rows found. Fill in the blank rows below the worksheet headers.');
 if(rows.length>200)throw new ImportError('Import up to 200 rolls at a time.');
 const digest=importDigest(rows,locationId);const duplicate=(inventory.importKeys??[]).includes(digest);
 return {mode:'rolls' as const,productCount:0,rollCount:rows.length,measuredAt,rows,location,digest,duplicate,canImport:!duplicate&&rows.every(r=>!r.errors.length)};
}
export async function commitImport(storage:JsonStorage,rows:ImportRow[],locationId:string,digest:string){
 if(!rows.length||rows.some(r=>r.errors.length)||digest!==importDigest(rows,locationId))throw new ImportError('Preview the worksheet again.');
 const current=await readInventory(storage);
 return updateDocument<Inventory,Roll[]>(storage,'inventory/catalog.json',current,data=>{
  if(!data.locations.some(l=>l.id===locationId&&l.active))throw new ImportError('The location is no longer active. Preview again.');
  if((data.importKeys??[]).includes(digest))throw new ImportError('This worksheet has already been imported. No rolls were added.');
  if(data.rolls.length+rows.length>10000)throw new ImportError('The inventory limit of 10,000 rolls would be exceeded.');
  const labels=new Set(data.rolls.map(r=>r.label)),now=new Date().toISOString();
  const created=rows.map(r=>{let label=`RR-${randomUUID().slice(0,8).toUpperCase()}`;while(labels.has(label))label=`RR-${randomUUID().slice(0,8).toUpperCase()}`;labels.add(label);return {id:randomUUID(),label,productId:r.productId,productName:r.name,sku:r.sku,widthIn:r.widthIn,feet:r.feet,locationId,bin:r.bin,notes:r.notes,status:'available' as const,updatedAt:now,createdAt:now};});
  return {value:{...data,rolls:[...data.rolls,...created],importKeys:[...(data.importKeys??[]),digest]},result:created};
 });
}
