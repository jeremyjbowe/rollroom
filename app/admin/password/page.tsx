import {redirect} from 'next/navigation';
import {isAdmin} from '../../../lib/auth';
import PasswordForm from './password-form';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <PasswordForm/>}
