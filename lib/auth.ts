import {cookies} from 'next/headers';
import {validSession} from './session';
export const cookieName=process.env.NODE_ENV==='production'?'__Host-rollroom-admin':'rollroom-admin';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:8*60*60};
export function authConfig(){const hash=process.env.ADMIN_PASSWORD_HASH||'';const secret=process.env.ADMIN_SESSION_SECRET||'';if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)||secret.length<32)throw new Error('Admin login is not configured.');return {hash,secret};}
export async function isAdmin(){try{const {hash,secret}=authConfig();return validSession((await cookies()).get(cookieName)?.value,secret,hash);}catch{return false;}}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
