import {cookies} from 'next/headers';
import {validSession} from './session';
import {storage} from './storage';
import {currentPasswordHash} from './admin-credentials';
export const cookieName=process.env.NODE_ENV==='production'?'__Host-rollroom-admin':'rollroom-admin';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:8*60*60};
export async function authConfig(){const bootstrap=process.env.ADMIN_PASSWORD_HASH||'';const secret=process.env.ADMIN_SESSION_SECRET||'';if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(bootstrap)||secret.length<32)throw new Error('Admin login is not configured.');return {hash:await currentPasswordHash(storage,bootstrap),secret};}
export async function isAdmin(){try{const token=(await cookies()).get(cookieName)?.value;if(!token)return false;const {hash,secret}=await authConfig();return validSession(token,secret,hash);}catch{return false;}}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
