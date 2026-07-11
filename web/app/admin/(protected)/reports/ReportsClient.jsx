'use client';

// Ports admin.js's Reports page: setReportRange/toggleReportMode/
// _renderReportsInner/renderRevenueChart/renderTopList. The hand-drawn
// <canvas> line chart becomes a Recharts LineChart (same two series/colors);
// the ranked lists become <RankedList>.
import { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import RankedList from '../../../../lib/admin/RankedList';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function bucketBookings(bookings, mode) {
  const keyFn = mode === 'daily'
    ? (d) => d.toISOString().slice(0, 10)
    : (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const buckets = {};
  bookings.forEach((b) => {
    const d = new Date(b.created_at);
    const key = keyFn(d);
    if (!buckets[key]) buckets[key] = { key, revenue: 0, profit: 0 };
    buckets[key].revenue += Number(b.customer_paid) || Number(b.total_amount) || 0;
    buckets[key].profit += Number(b.profit_margin) || 0;
  });
  return Object.values(buckets)
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((row) => ({ ...row, label: mode === 'daily' ? row.key.slice(5) : row.key, revenue: Math.round(row.revenue * 100) / 100, profit: Math.round(row.profit * 100) / 100 }));
}

export default function ReportsClient() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [mode, setMode] = useState('daily');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/bookings?limit=200');
    const data = await res.json();
    if (data.ok) setBookings(data.bookings || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const inRange = confirmed.filter((b) => b.created_at && new Date(b.created_at) >= cutoff);
  const chartData = bucketBookings(inRange, mode);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>التقارير</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>نظرة تحليلية على الإيرادات والوجهات وشركات الطيران</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: ADMIN_COLORS.bg3, borderRadius: 10 }}>
            {[[30, '30 يوم'], [90, '90 يوم'], [365, 'سنة']].map(([d, label]) => (
              <button key={d} type="button" onClick={() => setRange(d)} style={range === d ? activeSmallBtnStyle : smallGhostBtnStyle}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setMode((m) => (m === 'daily' ? 'monthly' : 'daily'))} style={ghostBtnStyle}>
            {mode === 'daily' ? 'عرض شهري' : 'عرض يومي'}
          </button>
        </div>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>📈 الإيرادات والربح</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: ADMIN_COLORS.tx2 }}>
            <span><span style={dotStyle(ADMIN_COLORS.blue)} />الإيرادات</span>
            <span><span style={dotStyle(ADMIN_COLORS.teal)} />الربح</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px', height: 260 }}>
          {!loading && chartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: ADMIN_COLORS.tx3, fontSize: 13 }}>لا توجد بيانات لهذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={ADMIN_COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: ADMIN_COLORS.tx3 }} axisLine={{ stroke: ADMIN_COLORS.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: ADMIN_COLORS.tx3 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={{ background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: ADMIN_COLORS.tx2 }}
                  formatter={(v) => `€${Number(v).toFixed(2)}`}
                />
                <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke={ADMIN_COLORS.blue} strokeWidth={2} dot={{ r: 2.5 }} />
                <Line type="monotone" dataKey="profit" name="الربح" stroke={ADMIN_COLORS.teal} strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>🌍 أكثر المسارات مبيعاً</div>
          <div style={{ padding: '14px 20px' }}>
            <RankedList bookings={inRange} fieldFn={(b) => b.route_label} icon="✈️" />
          </div>
        </div>
        <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>🏷 أكثر كودات الخصم استخداماً</div>
          <div style={{ padding: '14px 20px' }}>
            <RankedList bookings={inRange.filter((b) => b.promo_code)} fieldFn={(b) => b.promo_code} icon="🏷" />
          </div>
        </div>
      </div>
    </div>
  );
}

function dotStyle(color) {
  return { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginInlineEnd: 4 };
}

const ghostBtnStyle = { padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent', color: ADMIN_COLORS.tx, fontSize: 13, cursor: 'pointer' };
const smallGhostBtnStyle = { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: ADMIN_COLORS.tx2, fontSize: 12, cursor: 'pointer' };
const activeSmallBtnStyle = { ...smallGhostBtnStyle, background: ADMIN_COLORS.card, color: ADMIN_COLORS.tx, fontWeight: 700 };
