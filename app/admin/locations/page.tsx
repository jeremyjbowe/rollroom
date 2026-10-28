import {redirect} from 'next/navigation';
import {isAdmin} from '../../../lib/auth';
import Inventory from '../../inventory/inventory';
export const dynamic='force-dynamic';
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <Inventory manageLocations/>}
