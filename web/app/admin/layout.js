// Root layout for the /admin segment — a separate root from the public
// site's (de)/[lang] layouts (per Next's "multiple root layouts"
// pattern already used there: any top-level segment not nested under
// one of those two needs its own <html>/<body>). Admin is not
// localized/SEO'd, so this is deliberately much simpler than
// RootLayoutChrome.jsx — no i18n, no JSON-LD, no analytics.
//
// This layout stays auth-agnostic (must render /admin/login too, which
// can't itself require a session) — the actual auth gate lives one
// level down in app/admin/(protected)/layout.js.
import { ADMIN_COLORS, ADMIN_FONT_SANS } from '../../lib/admin/theme';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'Airpiv — لوحة التحكم',
  robots: 'noindex, nofollow',
};

export default function AdminRootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: ADMIN_FONT_SANS, background: ADMIN_COLORS.bg, color: ADMIN_COLORS.tx }}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
