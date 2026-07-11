import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import AncillaryClient from './AncillaryClient';

export default async function AncillaryPage() {
  const session = await getAdminSession();
  if (session.role !== 'admin') redirect('/admin');
  return <AncillaryClient />;
}
