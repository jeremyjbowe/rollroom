import type {Product} from './calculator';
export function isProductAdmin(userId:string|null|undefined,adminId:string|null|undefined){return Boolean(userId && adminId && userId===adminId);}
export function calculatorProducts(rows:Product[]){return rows.filter(p=>p.active).map(({id,name,sku,thicknessMil,coreIn,measuredAt})=>({id,name,sku,thicknessMil,coreIn,measuredAt,active:true}));}
