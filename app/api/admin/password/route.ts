import {cookies} from 'next/headers';
import {authConfig,cookieName,cookieOptions,sameOrigin} from '../../../../lib/auth';
import {validSession} from '../../../../lib/session';
import {storage} from '../../../../lib/storage';
import {changePassword,consumePasswordAttempt,PasswordChangeError} from '../../../../lib/admin-credentials';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403,headers});
 try{
  const {hash,secret}=await authConfig();const jar=await cookies();
  if(!await validSession(jar.get(cookieName)?.value,secret,hash))return Response.json({error:'Your session expired. Sign in again.'},{status:401,headers});
  const raw=await req.text();if(raw.length>6000)return Response.json({error:'Password data is too large.'},{status:413,headers});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid password data.'},{status:400,headers});}
  if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'Invalid password data.'},{status:400,headers});
  if(!await consumePasswordAttempt(storage))return Response.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429,headers:{...headers,'Retry-After':'900'}});
  await changePassword(storage,process.env.ADMIN_PASSWORD_HASH||'',hash,body.currentPassword,body.newPassword,body.confirmPassword);
  jar.set(cookieName,'',{...cookieOptions,maxAge:0});
  return Response.json({ok:true},{headers});
 }catch(e){return Response.json({error:e instanceof PasswordChangeError?e.message:'Unable to change the password. Please try again.'},{status:e instanceof PasswordChangeError?400:503,headers});}
}
