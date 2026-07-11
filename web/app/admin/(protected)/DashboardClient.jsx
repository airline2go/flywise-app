'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ADMIN_COLORS } from '../../../lib/admin/theme';

function fmtDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(d) {
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  return monday;
}

function statusBadge(status) {
  if (status === 'confirmed') return <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ مؤكد</span>;
  if (status === 'pending') return <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ معلق</span>;
  if (status === 'cancelled') return <span style={badgeStyle(ADMIN_COLORS.red)}>✕ ملغى</span>;
  return <span style={badgeStyle(ADMIN_COLORS.tx3)}>{status || '—'}</span>;
}

export default function DashboardClient() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [period, setPeriod] = useState('week');
  const today = new Date();
  const [from, setFrom] = useState(fmtDateInput(mondayOf(today)));
  const [to, setTo] = useState(fmtDateInput(today));
  const [periodStats, setPeriodStats] = useState(null);
  const [periodError, setPeriodError] = useState('');

  const load = useCallback(async () => {
    const [statsRes, bookingsRes] = await Promise.all([
      fetch('/admin/api/stats'),
      fetch('/admin/api/bookings?limit=8'),
    ]);
    const [statsData, bookingsData] = await Promise.all([statsRes.json(), bookingsRes.json()]);
    if (statsData.ok) setStats(statsData);
    if (bookingsData.ok) setRecent(bookingsData.bookings || []);
  }, []);

  const loadPeriod = useCallback(async (f, t) => {
    if (!f || !t) { setPeriodError('اختر تاريخ البداية والنهاية'); return; }
    setPeriodError('');
    const res = await fetch(`/admin/api/stats?from=${f}&to=${t}`);
    const data = await res.json();
    if (data.ok) setPeriodStats(data);
    else setPeriodError(data.error || 'فشل تحميل البيانات');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
      loadPeriod(from, to);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function setQuickPeriod(which) {
    setPeriod(which);
    let f = from;
    let t = to;
    if (which === 'today') { f = fmtDateInput(today); t = fmtDateInput(today); }
    else if (which === 'week') { f = fmtDateInput(mondayOf(today)); t = fmtDateInput(today); }
    else if (which === 'month') { f = fmtDateInput(new Date(today.getFullYear(), today.getMonth(), 1)); t = fmtDateInput(today); }
    setFrom(f);
    setTo(t);
    loadPeriod(f, t);
  }

  const margin = stats && stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : '0';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>لوحة التحكم</h1>
        <button type="button" onClick={load} style={ghostBtnStyle}>🔄 تحديث</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard label="إجمالي الإيرادات" value={stats ? `€${stats.revenue.toFixed(2)}` : '€0'} sub={stats ? `${stats.bookingsCount} حجز مؤكد` : 'جارٍ التحميل...'} color={ADMIN_COLORS.teal} />
        <StatCard label="صافي الربح" value={stats ? `€${stats.profit.toFixed(2)}` : '€0'} sub={stats ? `هامش ${margin}%` : '—'} color={ADMIN_COLORS.teal} />
        <StatCard label="عدد الحجوزات" value={stats ? stats.bookingsCount : 0} sub="—" color={ADMIN_COLORS.blue} />
        <StatCard label="خصومات مُطبَّقة" value={stats ? `€${stats.discounts.toFixed(2)}` : '€0'} sub="—" color={ADMIN_COLORS.yellow} />
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>📅 الأرباح حسب الفترة</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['month', 'هذا الشهر']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setQuickPeriod(key)} style={period === key ? activeSmallBtnStyle : smallGhostBtnStyle}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={labelStyle}>
              من تاريخ
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriod('custom'); }} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              إلى تاريخ
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriod('custom'); }} style={inputStyle} />
            </label>
            <button type="button" onClick={() => loadPeriod(from, to)} style={primaryBtnStyle}>عرض</button>
          </div>
          {periodError && <div style={{ color: ADMIN_COLORS.red, fontSize: 12.5 }}>{periodError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatCard label="إيرادات الفترة" value={periodStats ? `€${periodStats.revenue.toFixed(2)}` : '€0'} color={ADMIN_COLORS.teal} />
            <StatCard label="ربح الفترة" value={periodStats ? `€${periodStats.profit.toFixed(2)}` : '€0'} color={ADMIN_COLORS.teal} />
            <StatCard label="عدد الحجوزات" value={periodStats ? periodStats.bookingsCount : 0} color={ADMIN_COLORS.blue} />
          </div>
        </div>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>آخر الحجوزات</div>
          <Link href="/admin/bookings" style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, textDecoration: 'none' }}>عرض الكل ←</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: ADMIN_COLORS.bg3 }}>
                <th style={thStyle}>رقم الحجز</th>
                <th style={thStyle}>المسافر</th>
                <th style={thStyle}>الرحلة</th>
                <th style={thStyle}>دفع العميل</th>
                <th style={thStyle}>الربح</th>
                <th style={thStyle}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={6} style={emptyCellStyle}>لا توجد حجوزات بعد</td></tr>}
              {recent.map((b) => (
                <tr key={b.id} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{b.booking_reference || '—'}</td>
                  <td style={tdStyle}>{b.customer_email || '—'}</td>
                  <td style={tdStyle}>{b.route_label || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.blue }}>€{(Number(b.customer_paid) || 0).toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.teal }}>€{(Number(b.profit_margin) || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{statusBadge(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: color || ADMIN_COLORS.tx }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function badgeStyle(color) {
  return { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color, background: `${color}22` };
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: ADMIN_COLORS.tx2 };
const inputStyle = { padding: '9px 11px', background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14 };
const primaryBtnStyle = { padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal, color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const ghostBtnStyle = { padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent', color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer' };
const smallGhostBtnStyle = { padding: '6px 12px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent', color: ADMIN_COLORS.tx, fontSize: 12, cursor: 'pointer' };
const activeSmallBtnStyle = { ...smallGhostBtnStyle, background: ADMIN_COLORS.tealGlow, borderColor: ADMIN_COLORS.teal, color: ADMIN_COLORS.teal };
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
