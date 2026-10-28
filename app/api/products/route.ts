import {getDb} from '../../../db';
import {products,settings} from '../../../db/schema';
import {eq,asc} from 'drizzle-orm';
import {getChatGPTUser} from '../../chatgpt-auth';
import {validateProduct} from '../../../lib/calculator';
import {isProductAdmin,calculatorProducts} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();
 const db=getDb(); const admin=await db.select().from(settings).where(eq(settings.id,'owner')).get();
 const canManage=isProductAdmin(user?.userId,admin?.adminId);
 const rows=await db.select().from(products).orderBy(asc(products.name));
 return Response.json({products:canManage?rows:calculatorProducts(rows),canManage,needsSetup:false},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}
export async function POST(req:Request){
 const user=await getChatGPTUser(); if(!user)return Response.json({error:'Sign in first.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 const db=getDb();const admin=await db.select().from(settings).where(eq(settings.id,'owner')).get();
 if(!isProductAdmin(user.userId,admin?.adminId))return Response.json({error:'Only the product administrator can save changes.'},{status:403});
 try {const body=await req.json() as Record<string,unknown>;const values=validateProduct(body);if(body.id){if(typeof body.id!=='string')throw new Error('Invalid product.');const result=await db.update(products).set(values).where(eq(products.id,body.id)).returning();if(!result.length)return Response.json({error:'Product no longer exists.'},{status:404});}else{await db.insert(products).values({id:crypto.randomUUID(),...values});}return Response.json({ok:true});}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Unable to save product.'},{status:400});}
}
