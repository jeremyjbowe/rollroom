import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {isAdmin} from '../../../../lib/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){
 if(!await isAdmin())return Response.json({error:'Admin sign-in required.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const format=new URL(req.url).searchParams.get('format')??'xlsx';
 if(format!=='xlsx'&&format!=='pdf')return Response.json({error:'Choose Excel or PDF.'},{status:400});
 const template=new URL(req.url).searchParams.get('template');
 const filename=`${template==='remnant'?'rollroom-remnant-worksheet':'rollroom-product-inventory-worksheet'}.${format}`;
 try{const file=await readFile(path.join(process.cwd(),'assets/templates',filename));return new Response(file,{headers:{'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'The worksheet is temporarily unavailable.'},{status:503});}
}
