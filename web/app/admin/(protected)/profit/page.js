import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import ProfitClient from './ProfitClient';

export default async function ProfitPage() {
  const session = await getAdminSession();
  if (session.role !== 'admin') redirect('/admin');
  return <ProfitClient />;
}
