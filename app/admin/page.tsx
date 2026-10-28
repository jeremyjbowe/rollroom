import {redirect} from 'next/navigation';
import {isAdmin} from '../../lib/auth';
import Rollroom from '../rollroom';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <Rollroom admin/>;}
