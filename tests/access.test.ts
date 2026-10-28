import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isProductAdmin,calculatorProducts} from '../lib/access.ts';
import {POST} from '../app/api/setup/route.ts';
test('only the registered stable user ID can administer products',()=>{assert.equal(isProductAdmin('owner','owner'),true);for(const [user,admin] of [[null,null],[undefined,undefined],['',''],['other','owner'],[null,'owner'],['owner',null]])assert.equal(isProductAdmin(user,admin),false);});
test('public product data excludes archived products and private metadata',()=>{const p={id:'p',name:'Vinyl',sku:'SKU',thicknessMil:10,coreIn:3.12,measuredAt:'2026-10-28',notes:'Private notes',updatedAt:'private metadata',active:true};const result=calculatorProducts([p,{...p,id:'archived',active:false}]);assert.equal(result.length,1);assert.deepEqual(Object.keys(result[0]).sort(),['id','name','sku','thicknessMil','coreIn','measuredAt','active'].sort());assert.equal(JSON.stringify(result).includes('Private'),false);});
test('administrator registration is closed, including if database is empty',async()=>{const r=await POST();assert.equal(r.status,403);});
