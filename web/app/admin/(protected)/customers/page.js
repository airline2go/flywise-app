import { getAdminSession } from '../../../../lib/admin/adminFetch';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const session = await getAdminSession();
  return <CustomersClient role={session.role} />;
}
