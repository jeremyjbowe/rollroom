import {isAdmin,sameOrigin} from '../../../lib/auth';
import {storage} from '../../../lib/storage';
import {listProducts,saveProduct} from '../../../lib/products';
import {calculatorProducts} from '../../../lib/access';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(){try{const canManage=await isAdmin();const rows=await listProducts(storage);return Response.json({products:canManage?rows:calculatorProducts(rows),canManage},{headers});}catch{return Response.json({error:'The product library is temporarily unavailable. Please try again.'},{status:503,headers});}}
export async function POST(req:Request){if(!await isAdmin())return Response.json({error:'Admin sign-in required.'},{status:401});if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});try{const raw=await req.text();if(raw.length>10000)return Response.json({error:'Product data is too large.'},{status:413});const body=JSON.parse(raw);await saveProduct(storage,body);return Response.json({ok:true},{headers});}catch(e){return Response.json({error:e instanceof Error&&/product|thickness|diameter|date|SKU|name|library supports/i.test(e.message)?e.message:'Unable to save product. Please try again.'},{status:400,headers});}}
