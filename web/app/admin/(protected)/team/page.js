import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import TeamClient from './TeamClient';

// [STAFF-ROLES] Server-side gate matching requireFullAdmin — a staff
// session redirects to the dashboard instead of hitting a page whose
// every API call would just 403. Real enforcement is still server-side
// (admin-staff.routes.js), this only avoids showing a broken page.
export default async function TeamPage() {
  const session = await getAdminSession();
  if (session.role !== 'admin') redirect('/admin');
  return <TeamClient />;
}
