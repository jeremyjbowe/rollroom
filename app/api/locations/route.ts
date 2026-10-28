import {sameOrigin,isAdmin} from '../../../lib/auth';
import {storage} from '../../../lib/storage';
import {changeLocation,InventoryError} from '../../../lib/inventory';
export const runtime='nodejs';
export async function POST(req:Request){if(!await isAdmin())return Response.json({error:'Admin sign-in required.'},{status:401});if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});try{const raw=await req.text();if(raw.length>2000)return Response.json({error:'Location data is too large.'},{status:413});const body=JSON.parse(raw);if(!body||typeof body!=='object')throw new InventoryError('Invalid location.');return Response.json({location:await changeLocation(storage,body)},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof InventoryError?e.message:'Unable to save the location.'},{status:400});}}
