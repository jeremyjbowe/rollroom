import {redirect} from 'next/navigation';
import {isAdmin} from '../../../lib/auth';
import Login from './login';
export const dynamic='force-dynamic';
export const metadata={title:'Admin sign in · Rollroom',robots:{index:false,follow:false}};
export default async function Page(){if(await isAdmin())redirect('/admin');return <Login/>;}
