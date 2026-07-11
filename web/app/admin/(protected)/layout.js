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
import { ADMIN_COLORS } from '../../../lib/admin/theme';

const NAV_ITEMS = [
  { href: '/admin', label: 'لوحة التحكم' },
  { href: '/admin/bookings', label: 'الحجوزات' },
  { href: '/admin/customers', label: 'العملاء' },
  { href: '/admin/invoices', label: 'الفواتير الضريبية' },
  { href: '/admin/promos', label: 'كودات الخصم' },
  { href: '/admin/blog', label: 'المدونة' },
  { href: '/admin/route-pages', label: 'صفحات المسارات' },
  { href: '/admin/geo', label: 'المطارات والمدن' },
  { href: '/admin/team', label: 'الفريق', fullAdminOnly: true },
];

export default async function AdminProtectedLayout({ children }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  // [STAFF-ROLES] Client-side hiding is UX only — the real boundary is
  // requireFullAdmin server-side (matches admin.js's applyRoleGating()).
  const navItems = NAV_ITEMS.filter((item) => !item.fullAdminOnly || session.role === 'admin');

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
        <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Airpiv Admin</strong>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} style={{ color: ADMIN_COLORS.tx2, fontSize: 13.5, textDecoration: 'none' }}>{item.label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: ADMIN_COLORS.tx2 }}>
          <span>{session.name || (session.role === 'admin' ? 'مدير' : 'موظف')}</span>
          <LogoutButton />
        </div>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
