import Rollroom from '../rollroom';
import {requireChatGPTUser,chatGPTSignOutPath} from '../chatgpt-auth';
import {getDb} from '../../db';
import {settings} from '../../db/schema';
import {eq} from 'drizzle-orm';
import {isProductAdmin} from '../../lib/access';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){
 const user=await requireChatGPTUser('/admin');
 const admin=await getDb().select().from(settings).where(eq(settings.id,'owner')).get();
 if(!isProductAdmin(user.userId,admin?.adminId))return <main><section className="panel inputs"><div className="eyebrow">PRODUCT ADMINISTRATION</div><h1>Administrator access only.</h1><p>This account can use the calculator, but cannot manage products.</p><a className="primary" href="/">Open calculator</a> <a className="secondary" href={chatGPTSignOutPath('/admin')} target="_top">Switch account</a></section></main>;
 return <Rollroom admin/>;
}
