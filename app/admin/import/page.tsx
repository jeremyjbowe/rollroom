import {redirect} from 'next/navigation';
import {isAdmin} from '../../../lib/auth';
import ImportForm from './import-form';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <ImportForm/>}
