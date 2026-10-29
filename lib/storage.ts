import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {Conflict,type JsonStorage} from './atomic-store';
export const storage:JsonStorage={
 async read<T>(path:string){const result=await get(path,{access:'private',useCache:false});if(!result)return null;if(path==='inventory/catalog.json')console.info('Inventory storage version',{etag:result.blob.etag,encoding:result.headers.get('content-encoding')});if(result.statusCode!==200)throw new Error('Unexpected storage response.');return {value:await new Response(result.stream).json() as T,etag:result.blob.etag};},
 async write<T>(path:string,value:T,etag:string|null){try{await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,ifMatch:etag??undefined,contentType:'application/json',cacheControlMaxAge:60});}catch(e){if(e instanceof BlobPreconditionFailedError||(e instanceof Error&&/already exists/i.test(e.message)))throw new Conflict();throw e;}}
};
