import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimate,validateProduct} from '../lib/calculator.ts';
test('matches independently verified Duggal example',()=>assert.ok(Math.abs(estimate(8,3.12,10,0).feet-355.16752146383806)<1e-9));
test('empty roll, waste, and no negative usable footage',()=>{assert.equal(estimate(3.12,3.12,10,0).feet,0);assert.equal(estimate(8,3.12,10,500).usable,0);assert.equal(estimate(8,3.12,10,10).usable,estimate(8,3.12,10,0).feet-10);});
test('invalid measurements are rejected',()=>{for(const args of [[2,3,10,0],[8,3,0,0],[8,0,10,0],[8,3,10,-1],[NaN,3,10,0],[Infinity,3,10,0]])assert.throws(()=>estimate(...args as [number,number,number,number]));});
test('thickness inversely scales length',()=>assert.equal(estimate(8,3,20,0).feet,estimate(8,3,10,0).feet/2));
test('product validation rejects missing, invalid, and impossible measurements',()=>{const p={name:'Measured vinyl',sku:'TEST',notes:'',thicknessMil:10,coreIn:3.12,measuredAt:'2026-10-28'};assert.equal(validateProduct(p).thicknessMil,10);for(const invalid of [{thicknessMil:0},{coreIn:0},{name:''},{measuredAt:'2026-02-30'},{thicknessMil:NaN}])assert.throws(()=>validateProduct({...p,...invalid}));});
