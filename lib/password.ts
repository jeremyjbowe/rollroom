import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export async function hashPassword(password:string){if(password.length<16||password.length>256)throw new Error('Use a password between 16 and 256 characters.');const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `scrypt:${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password:string,encoded:string){if(password.length>256||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded))return false;const [,salt,hex]=encoded.split(':');const hash=await scrypt(password,salt,64) as Buffer;return timingSafeEqual(hash,Buffer.from(hex,'hex'));}
export const credentialVersion=(hash:string)=>createHash('sha256').update(hash).digest('hex');
