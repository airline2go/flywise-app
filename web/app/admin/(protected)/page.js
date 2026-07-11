// Dashboard placeholder — proves the authenticated round trip
// (adminFetch → flywise-server /admin/stats) end to end. Real KPI
// tiles + Recharts revenue chart land in milestone A6.
import { adminFetch } from '../../../lib/admin/adminFetch';
import { ADMIN_COLORS } from '../../../lib/admin/theme';

async function getStats() {
  const res = await adminFetch('/admin/stats');
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>لوحة التحكم</h1>
      {stats && stats.ok ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <StatTile label="إجمالي الإيرادات" value={`€${stats.revenue.toFixed(2)}`} />
          <StatTile label="صافي الربح" value={`€${stats.profit.toFixed(2)}`} />
          <StatTile label="عدد الحجوزات" value={stats.bookingsCount} />
        </div>
      ) : (
        <p style={{ color: ADMIN_COLORS.red }}>تعذّر تحميل الإحصائيات.</p>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
