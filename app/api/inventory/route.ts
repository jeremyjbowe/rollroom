import {sameOrigin} from '../../../lib/auth';
import {storage} from '../../../lib/storage';
import {readInventory,saveRoll,InventoryError} from '../../../lib/inventory';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){try{return Response.json(await readInventory(storage),{headers});}catch{return Response.json({error:'Inventory is temporarily unavailable.'},{status:503,headers});}}
export async function POST(req:Request){if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});try{const raw=await req.text();if(raw.length>6000)return Response.json({error:'Roll data is too large.'},{status:413});const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'Invalid roll data.'},{status:400});return Response.json({roll:await saveRoll(storage,body)},{headers});}catch(e){return Response.json({error:e instanceof InventoryError?e.message:'Unable to save the roll. Please try again.'},{status:e instanceof InventoryError?400:503,headers});}}
