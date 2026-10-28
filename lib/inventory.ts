import {randomUUID} from 'node:crypto';
import {updateDocument,type JsonStorage} from './atomic-store.ts';
import {listProducts} from './products.ts';
export type Location={id:string;name:string;active:boolean};
export type Roll={id:string;label:string;productId:string;productName:string;sku:string;widthIn:number;feet:number;locationId:string;bin:string;notes:string;status:'available'|'used'|'removed';updatedAt:string;createdAt:string};
export type Inventory={locations:Location[];rolls:Roll[]};
const path='inventory/catalog.json';
const initial:Inventory={locations:[{id:'dtp-st-george',name:'DTP St. George',active:true},{id:'dtp-vegas',name:'DTP Vegas',active:true}],rolls:[]};
export class InventoryError extends Error{}
function fail(message:string):never{throw new InventoryError(message);}
function text(value:unknown,max:number,required=false){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail('Enter valid text within the field limit.');return value.trim();}
function number(value:unknown,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>max)fail('Width and remaining length must be positive numbers within the allowed range.');return value;}
export async function readInventory(storage:JsonStorage):Promise<Inventory>{return (await storage.read<Inventory>(path))?.value??structuredClone(initial);}
export async function changeLocation(storage:JsonStorage,body:Record<string,unknown>){return updateDocument(storage,path,initial,data=>{const name=text(body.name,80,true);const existing=data.locations.find(l=>l.id===body.id);if(body.id&&!existing)fail('Location no longer exists.');const active=body.active!==false;if(!active&&data.rolls.some(r=>r.locationId===body.id&&r.status==='available'))fail('Move or remove available rolls at this location before removing it.');if(data.locations.some(l=>l.id!==body.id&&l.name.toLowerCase()===name.toLowerCase()))fail('A location with this name already exists.');if(!existing&&data.locations.length>=100)fail('The location limit has been reached.');const next={id:existing?.id??randomUUID(),name,active};return {value:{...data,locations:existing?data.locations.map(l=>l.id===next.id?next:l):[...data.locations,next]},result:next};});}
export async function saveRoll(storage:JsonStorage,body:Record<string,unknown>){
 const products=await listProducts(storage);
 return updateDocument(storage,path,initial,data=>{
  const old=data.rolls.find(r=>r.id===body.id);
  if(body.id&&!old)fail('Roll no longer exists.');
  if(old&&body.updatedAt!==old.updatedAt)fail('This roll changed at another station. Refresh and try again.');
  const status=body.status??'available';if(!['available','used','removed'].includes(status as string))fail('Invalid roll status.');
  const product=products.find(p=>p.id===body.productId&&p.active);
  if(!product&&(!old||body.productId!==old.productId||status==='available'))fail('Choose an active product.');
  if(status==='available'&&!data.locations.some(l=>l.id===body.locationId&&l.active))fail('Choose an active location.');
  const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0)).toISOString();
  let label=old?.label??`RR-${randomUUID().slice(0,8).toUpperCase()}`;
  while(!old&&data.rolls.some(r=>r.label===label))label=`RR-${randomUUID().slice(0,8).toUpperCase()}`;
  const roll:Roll={id:old?.id??randomUUID(),label,productId:product?.id??old!.productId,productName:product?.name??old!.productName,sku:product?.sku??old!.sku,widthIn:number(body.widthIn,1000),feet:number(body.feet,1000000),locationId:text(body.locationId,80,true),bin:text(body.bin??'',80),notes:text(body.notes??'',300),status:status as Roll['status'],createdAt:old?.createdAt??now,updatedAt:now};
  if(!old&&status!=='available')fail('New rolls must be available.');
  if(!old&&data.rolls.length>=10000)fail('The inventory limit has been reached.');
  return {value:{...data,rolls:old?data.rolls.map(r=>r.id===old.id?roll:r):[...data.rolls,roll]},result:roll};
 });
}
