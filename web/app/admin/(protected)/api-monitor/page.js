import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import ExactDuffelMonitorClient from './ExactDuffelMonitorClient';

export default async function ApiMonitorPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  if (session.role !== 'admin') redirect('/admin');
  return <ExactDuffelMonitorClient />;
}
