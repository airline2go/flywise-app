import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import ApiMonitorClient from './ApiMonitorClient';

export default async function ApiMonitorPage() {
  const session = await getAdminSession();
  if (session.role !== 'admin') redirect('/admin');
  return <ApiMonitorClient />;
}
