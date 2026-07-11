// Auth gate for every admin page except /admin/login itself — a plain
// route group (no URL segment added), matching the (de)/[lang] route
// group convention already used in this app. Redirects to /admin/login
// if there's no session cookie at all; an individual page's own
// adminFetch() calls handle the "cookie present but token stale/
// revoked" case (a 401 from flywise-server) themselves, since that
// requires an actual network round trip this layout can't do for free.
import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../lib/admin/adminFetch';
import LogoutButton from '../../../lib/admin/LogoutButton';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/route-pages', label: 'Route-Seiten' },
];

export default async function AdminProtectedLayout({ children }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1c3644' }}>
        <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Airpiv Admin</strong>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} style={{ color: '#9db3bd', fontSize: 13.5, textDecoration: 'none' }}>{item.label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#9db3bd' }}>
          <span>{session.name || (session.role === 'admin' ? 'Besitzer' : 'Mitarbeiter')}</span>
          <LogoutButton />
        </div>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
