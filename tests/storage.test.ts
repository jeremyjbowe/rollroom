import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {storage} from '../lib/storage.ts';
const require=createRequire(import.meta.url);
const {MockAgent,getGlobalDispatcher,setGlobalDispatcher}=createRequire(require.resolve('@vercel/blob'))('undici');

test('storage reads request identity encoding and preserve strong version tags',async()=>{
 const original=getGlobalDispatcher(),token=process.env.BLOB_READ_WRITE_TOKEN;
 const mock=new MockAgent();mock.disableNetConnect();setGlobalDispatcher(mock);
 process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_teststore_testsecret';
 const pool=mock.get('https://teststore.private.blob.vercel-storage.com');
 const request={path:'/inventory/catalog.json?cache=0',method:'GET',headers:{'accept-encoding':'identity'}};
 try{
  pool.intercept(request).reply(200,{rolls:Array.from({length:20},()=>({name:'Illumisol',feet:22}))},{headers:{etag:'"version-1"'}});
  const result=await storage.read<{rolls:unknown[]}>('inventory/catalog.json');
  assert.equal(result?.etag,'"version-1"');assert.equal(result?.value.rolls.length,20);
  pool.intercept(request).reply(200,{}, {headers:{etag:'W/"version-1"'}});
  await assert.rejects(storage.read('inventory/catalog.json'),/strong version tag/);
  pool.intercept(request).reply(200,{});
  await assert.rejects(storage.read('inventory/catalog.json'),/strong version tag/);
  mock.assertNoPendingInterceptors();
 }finally{setGlobalDispatcher(original);await mock.close();if(token===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=token;}
});
