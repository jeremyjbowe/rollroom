import {SignJWT,jwtVerify} from 'jose';
import {credentialVersion} from './password.ts';
const issuer='rollroom';const audience='rollroom-admin';
function key(secret:string){if(secret.length<32)throw new Error('Admin session secret is not configured.');return new TextEncoder().encode(secret);}
export async function createSession(secret:string,passwordHash:string,now=Math.floor(Date.now()/1000)){return new SignJWT({version:credentialVersion(passwordHash)}).setProtectedHeader({alg:'HS256'}).setSubject('admin').setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+8*60*60).sign(key(secret));}
export async function validSession(token:string|undefined,secret:string,passwordHash:string){if(!token||!passwordHash)return false;try{const {payload}=await jwtVerify(token,key(secret),{algorithms:['HS256'],issuer,audience,requiredClaims:['exp','iat','sub']});return payload.sub==='admin'&&payload.version===credentialVersion(passwordHash);}catch{return false;}}
