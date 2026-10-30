import {SignJWT,jwtVerify} from 'jose';
import {isAdmin,sameOrigin,authConfig} from '../../../../lib/auth';
import {storage} from '../../../../lib/storage';
import {previewImport,commitImport,ImportError} from '../../../../lib/inventory-import';
import {commitCatalogImport} from '../../../../lib/catalog-import';
export const runtime='nodejs';export const maxDuration=30;
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request){
 if(!await isAdmin())return Response.json({error:'Admin sign-in required.'},{status:401,headers});
 if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403,headers});
 try{
  if(Number(req.headers.get('content-length'))>2200000)throw new ImportError('Choose a file smaller than 2 MB.');
  const form=await req.formData(),file=form.get('file'),locationId=form.get('locationId'),action=form.get('action');
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx')||file.size>2*1024*1024||typeof locationId!=='string')throw new ImportError('Choose a .xlsx worksheet under 2 MB and an active location.');
  if(action!=='preview'&&action!=='import')throw new ImportError('Invalid import action.');
  const date=form.get('measuredAt');
  const preview=await previewImport(storage,new Uint8Array(await file.arrayBuffer()),locationId,typeof date==='string'?date:undefined);
  const key=new TextEncoder().encode((await authConfig()).secret);
  if(action==='preview'){
   const token=preview.canImport?await new SignJWT({digest:preview.digest,locationId,measuredAt:preview.measuredAt}).setProtectedHeader({alg:'HS256'}).setIssuer('rollroom-import').setAudience('rollroom-admin').setIssuedAt().setExpirationTime('10m').sign(key):null;
   return Response.json({...preview,token},{headers});
  }
  const token=form.get('token');if(typeof token!=='string')throw new ImportError('Preview the worksheet before importing.');
  let payload;try{({payload}=await jwtVerify(token,key,{algorithms:['HS256'],issuer:'rollroom-import',audience:'rollroom-admin',requiredClaims:['exp','iat']}));}catch{throw new ImportError('The preview expired. Preview the worksheet again.');}
  if(payload.digest!==preview.digest||payload.locationId!==locationId||(preview.mode==='catalog'&&payload.measuredAt!==preview.measuredAt))throw new ImportError('The worksheet or product library changed. Preview again.');
  if(!preview.canImport)throw new ImportError(preview.duplicate?'This worksheet has already been imported. No rolls were added.':'Fix the flagged rows and preview again.');
  const rolls=preview.mode==='catalog'?await commitCatalogImport(storage,preview.rows,locationId,preview.measuredAt,preview.digest):await commitImport(storage,preview.rows,locationId,preview.digest);
  return Response.json({rolls,count:rolls.length,productCount:preview.productCount},{headers});
 }catch(e){return Response.json({error:e instanceof ImportError?e.message:'Unable to process this worksheet. Please try again.'},{status:e instanceof ImportError?400:503,headers});}
}
