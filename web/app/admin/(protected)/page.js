// Dashboard placeholder — proves the authenticated round trip
// (adminFetch → flywise-server /admin/stats) end to end. Real KPI
// tiles + Recharts revenue chart land in milestone A6.
import { adminFetch } from '../../../lib/admin/adminFetch';

async function getStats() {
  const res = await adminFetch('/admin/stats');
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Dashboard</h1>
      {stats && stats.ok ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <StatTile label="Umsatz" value={`€${stats.revenue.toFixed(2)}`} />
          <StatTile label="Gewinn" value={`€${stats.profit.toFixed(2)}`} />
          <StatTile label="Buchungen" value={stats.bookingsCount} />
        </div>
      ) : (
        <p style={{ color: '#f87171' }}>Statistiken konnten nicht geladen werden.</p>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={{ background: '#0f2430', border: '1px solid #1c3644', borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#9db3bd' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
