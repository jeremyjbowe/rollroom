import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {Conflict,type JsonStorage} from './atomic-store.ts';
// Request uncompressed bytes: gzip responses have weak ETags, which cannot
// be used for conditional writes. Keep the exact strong ETag for concurrency safety.
export const storage:JsonStorage={
 async read<T>(path:string){const result=await get(path,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});if(!result)return null;if(result.statusCode!==200)throw new Error('Unexpected storage response.');if(!result.blob.etag||result.blob.etag.startsWith('W/'))throw new Error('Storage did not return a strong version tag.');return {value:await new Response(result.stream).json() as T,etag:result.blob.etag};},
 async write<T>(path:string,value:T,etag:string|null){try{await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,ifMatch:etag??undefined,contentType:'application/json',cacheControlMaxAge:60});}catch(e){if(e instanceof BlobPreconditionFailedError||(e instanceof Error&&/already exists/i.test(e.message)))throw new Conflict();throw e;}}
};
