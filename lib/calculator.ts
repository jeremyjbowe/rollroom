export type Product = {id:string;name:string;sku:string;thicknessMil:number;coreIn:number;notes:string;measuredAt:string;active:boolean;updatedAt:string};
export function estimate(diameter:number, core:number, thicknessMil:number, allowance:number) {
 if (![diameter,core,thicknessMil,allowance].every(Number.isFinite)) throw new Error('Enter valid measurements.');
 if(core<=0 || thicknessMil<=0) throw new Error('Core diameter and thickness must be greater than zero.');
 if(diameter<core) throw new Error('Roll diameter cannot be smaller than the core.');
 if(allowance<0) throw new Error('Allowance cannot be negative.');
 const feet = Math.PI*(diameter*diameter-core*core)/(4*(thicknessMil/1000))/12;
 if(!Number.isFinite(feet)) throw new Error('Measurements are outside the supported range.');
 return {feet,usable:Math.max(0,feet-allowance)};
}
export function validateProduct(p:any) {
 if(!p || typeof p.name!=='string' || !p.name.trim() || p.name.length>100) throw new Error('Enter a product name (up to 100 characters).');
 if(typeof p.sku!=='string'||p.sku.length>80||typeof p.notes!=='string'||p.notes.length>1000) throw new Error('Check the SKU and notes.');
 if(!Number.isFinite(p.thicknessMil)||p.thicknessMil<=0||p.thicknessMil>250) throw new Error('Total thickness must be between 0 and 250 mil.');
 if(!Number.isFinite(p.coreIn)||p.coreIn<=0||p.coreIn>30) throw new Error('Core outside diameter must be between 0 and 30 inches.');
 if(typeof p.measuredAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.measuredAt)||!Number.isFinite(Date.parse(p.measuredAt+'T00:00:00Z'))||new Date(p.measuredAt+'T00:00:00Z').toISOString().slice(0,10)!==p.measuredAt) throw new Error('Enter a valid measurement date.');
 return {name:p.name.trim(),sku:p.sku.trim(),notes:p.notes.trim(),thicknessMil:p.thicknessMil,coreIn:p.coreIn,measuredAt:p.measuredAt,active:p.active!==false,updatedAt:new Date().toISOString()};
}
