import {cookies} from 'next/headers';
import {authConfig,cookieName,cookieOptions,sameOrigin} from '../../../../lib/auth';
import {verifyPassword} from '../../../../lib/password';
import {createSession} from '../../../../lib/session';
import {consumeLoginAttempt} from '../../../../lib/atomic-store';
import {storage} from '../../../../lib/storage';
export const runtime='nodejs';
export async function POST(req:Request){if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});try{const {hash,secret}=authConfig();const raw=await req.text();if(raw.length>2048)return Response.json({error:'Invalid credentials.'},{status:400});const body=JSON.parse(raw);if(!await consumeLoginAttempt(storage))return Response.json({error:'Too many sign-in attempts. Try again in 15 minutes.'},{status:429,headers:{'Retry-After':'900'}});const valid=typeof body.password==='string'&&await verifyPassword(body.password,hash);if(body.username!=='admin'||!valid)return Response.json({error:'Incorrect username or password.'},{status:401});(await cookies()).set(cookieName,await createSession(secret,hash),cookieOptions);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Admin sign-in is temporarily unavailable. Please try again.'},{status:503});}}
