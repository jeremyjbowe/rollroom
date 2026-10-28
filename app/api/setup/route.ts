import {getDb} from '../../../db';
import {settings} from '../../../db/schema';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in first.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 const result=await getDb().insert(settings).values({id:'owner',adminId:user.userId}).onConflictDoNothing().returning();
 return result.length?Response.json({ok:true}):Response.json({error:'An administrator has already been assigned.'},{status:409});
}
