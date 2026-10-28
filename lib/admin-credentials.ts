import {updateDocument,type JsonStorage} from './atomic-store.ts';
import {credentialVersion,hashPassword,verifyPassword} from './password.ts';
const path='auth/admin-credentials.json';
type Credentials={hash:string;bootstrapVersion:string};
const validHash=(hash:string)=>/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
function resolve(stored:Credentials|null,bootstrap:string){if(!validHash(bootstrap))throw new Error('Admin login is not configured.');if(!stored||stored.bootstrapVersion!==credentialVersion(bootstrap))return bootstrap;if(!validHash(stored.hash))throw new Error('Invalid stored credentials.');return stored.hash;}
export async function currentPasswordHash(storage:JsonStorage,bootstrap:string){return resolve((await storage.read<Credentials>(path))?.value??null,bootstrap);}
export class PasswordChangeError extends Error{}
export async function changePassword(storage:JsonStorage,bootstrap:string,expectedHash:string,current:string,next:string,confirmation:string){
 if(typeof current!=='string'||typeof next!=='string'||typeof confirmation!=='string')throw new PasswordChangeError('Enter all three password fields.');
 if(next.length<16||next.length>256)throw new PasswordChangeError('Use a password between 16 and 256 characters. A memorable passphrase works well.');
 if(next!==confirmation)throw new PasswordChangeError('The new passwords do not match.');
 if(!await verifyPassword(current,expectedHash))throw new PasswordChangeError('The current password is incorrect.');
 if(current===next)throw new PasswordChangeError('Choose a different new password.');
 const hash=await hashPassword(next);
 await updateDocument<Credentials|null,boolean>(storage,path,null,stored=>{if(resolve(stored,bootstrap)!==expectedHash)throw new PasswordChangeError('The password changed in another session. Sign in again.');return {value:{hash,bootstrapVersion:credentialVersion(bootstrap)},result:true};});
}
export async function consumePasswordAttempt(storage:JsonStorage,now=Date.now()){return updateDocument(storage,'auth/password-change-attempts.json',{start:now,count:0},old=>{const current=now-old.start>=15*60*1000?{start:now,count:0}:old;if(current.count>=5)return {value:current,result:false};return {value:{start:current.start,count:current.count+1},result:true};});}
