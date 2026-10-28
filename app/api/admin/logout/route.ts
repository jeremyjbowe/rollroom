import {cookies} from 'next/headers';
import {cookieName,cookieOptions,sameOrigin} from '../../../../lib/auth';
export async function POST(req:Request){if(!sameOrigin(req))return Response.json({error:'Invalid request origin.'},{status:403});(await cookies()).set(cookieName,'',{...cookieOptions,maxAge:0});return Response.json({ok:true});}
