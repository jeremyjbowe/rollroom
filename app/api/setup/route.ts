// The owner was registered while the site was owner-private.
// Never permit first-visitor registration after public access is enabled.
export async function POST(){
 return Response.json({error:'Administrator registration is closed.'},{status:403,headers:{'Cache-Control':'no-store'}});
}
