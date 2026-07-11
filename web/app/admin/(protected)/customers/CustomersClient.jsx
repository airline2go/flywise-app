'use client';

import { useCallback, useEffect, useState } from 'react';
import CreditModal from '../../../../lib/admin/CreditModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const VIP_THRESHOLD = 3;

// [CUSTOMER-SEARCH] Mirrors admin.js's buildCustomers() exactly —
// customers aren't a real table, they're aggregated client-side from
// GET /admin/bookings (grouped by customer_email, first-non-empty-wins
// for name/phone/user_id across a customer's bookings).
function buildCustomers(bookings) {
  const map = {};
  bookings.forEach((b) => {
    const email = (b.customer_email || '').trim().toLowerCase();
    if (!email) return;
    if (!map[email]) map[email] = { email: b.customer_email, name: b.customer_name || '', phone: b.customer_phone || '', user_id: b.user_id || null, bookings: [] };
    if (!map[email].name && b.customer_name) map[email].name = b.customer_name;
    if (!map[email].phone && b.customer_phone) map[email].phone = b.customer_phone;
    if (!map[email].user_id && b.user_id) map[email].user_id = b.user_id;
    map[email].bookings.push(b);
  });
  return Object.values(map).map((c) => {
    const confirmed = c.bookings.filter((b) => b.status === 'confirmed');
    const totalSpent = confirmed.reduce((s, b) => s + (b.customer_paid || b.total_amount || 0), 0);
    const totalProfit = confirmed.reduce((s, b) => s + (b.profit_margin || 0), 0);
    const sorted = c.bookings.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return {
      email: c.email, name: c.name, phone: c.phone, user_id: c.user_id,
      bookingCount: c.bookings.length, confirmedCount: confirmed.length,
      totalSpent, totalProfit, lastBooking: sorted[0] ? sorted[0].created_at : null,
      bookings: sorted, isVip: confirmed.length >= VIP_THRESHOLD,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

function statusBadge(status) {
  if (status === 'confirmed') return <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ مؤكد</span>;
  if (status === 'pending') return <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ معلق</span>;
  if (status === 'cancelled') return <span style={badgeStyle(ADMIN_COLORS.red)}>✕ ملغى</span>;
  return <span style={badgeStyle(ADMIN_COLORS.tx3)}>{status || '—'}</span>;
}

export default function CustomersClient({ role }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vipOnly, setVipOnly] = useState(false);
  const [detail, setDetail] = useState(null);
  const [creditTarget, setCreditTarget] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    const res = await fetch(`/admin/api/bookings?${params.toString()}`);
    const data = await res.json();
    if (data.ok) setBookings(data.bookings || []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const customers = buildCustomers(bookings);
  const noEmailCount = bookings.filter((b) => !(b.customer_email || '').trim()).length;
  const visible = customers.filter((c) => !vipOnly || c.isVip);
  const vipCount = customers.filter((c) => c.isVip).length;
  const repeatCount = customers.filter((c) => c.confirmedCount > 1).length;
  const avgSpent = customers.length ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>العملاء</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>قائمة العملاء وسجل حجوزاتهم</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث بالإيميل أو الاسم أو رقم الهاتف..."
            style={{ minWidth: 260, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
          />
          <button type="button" onClick={() => setVipOnly((v) => !v)} style={vipOnly ? primaryBtnStyle : ghostBtnStyle}>⭐ VIP فقط</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="إجمالي العملاء" value={customers.length} sub={noEmailCount > 0 ? `${noEmailCount} حجز بدون إيميل عميل` : 'كل الحجوزات مرتبطة بعملاء'} />
        <StatCard label="عملاء VIP" value={vipCount} sub="3 حجوزات فأكثر" color={ADMIN_COLORS.teal} />
        <StatCard label="عملاء متكررون" value={repeatCount} sub="حجزوا أكثر من مرة" color={ADMIN_COLORS.yellow} />
        <StatCard label="متوسط إنفاق العميل" value={`€${avgSpent.toFixed(2)}`} sub="—" />
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: ADMIN_COLORS.bg3 }}>
              <th style={thStyle}>العميل</th>
              <th style={thStyle}>الهاتف</th>
              <th style={thStyle}>عدد الحجوزات</th>
              <th style={thStyle}>إجمالي الإنفاق</th>
              <th style={thStyle}>صافي ربحنا منه</th>
              <th style={thStyle}>آخر حجز</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={emptyCellStyle}>...جارٍ التحميل</td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={8} style={emptyCellStyle}>لا توجد نتائج</td></tr>}
            {!loading && visible.map((c) => (
              <tr key={c.email} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{c.name || 'بدون اسم'}</div>
                  <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, fontFamily: 'monospace' }}>{c.email}</div>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{c.phone || '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{c.bookingCount}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.blue }}>€{c.totalSpent.toFixed(2)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.teal }}>€{c.totalProfit.toFixed(2)}</td>
                <td style={tdStyle}>{c.lastBooking ? new Date(c.lastBooking).toLocaleDateString('ar') : '—'}</td>
                <td style={tdStyle}>{c.isVip ? <span style={badgeStyle(ADMIN_COLORS.teal)}>⭐ VIP</span> : <span style={badgeStyle(ADMIN_COLORS.tx3)}>عادي</span>}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => setDetail(c)} style={linkBtnStyle}>تفاصيل</button>
                  {role === 'admin' && c.user_id && (
                    <button type="button" onClick={() => setCreditTarget({ userId: c.user_id, name: c.name || c.email })} style={{ ...linkBtnStyle, marginInlineStart: 10 }}>+ رصيد</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div style={overlayStyle} onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{detail.name || detail.email}</h2>
              <button type="button" onClick={() => setDetail(null)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>معلومات العميل</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              <DetailItem label="الإيميل" value={detail.email} mono />
              <DetailItem label="الهاتف" value={detail.phone || '—'} mono />
              <DetailItem label="عدد الحجوزات" value={detail.bookingCount} />
              <DetailItem label="إجمالي الإنفاق" value={`€${detail.totalSpent.toFixed(2)}`} />
              <DetailItem label="صافي ربحنا منه" value={`€${detail.totalProfit.toFixed(2)}`} />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>سجل الحجوزات</div>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={smallThStyle}>المرجع</th>
                    <th style={smallThStyle}>التاريخ</th>
                    <th style={smallThStyle}>الرحلة</th>
                    <th style={smallThStyle}>المبلغ</th>
                    <th style={smallThStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.bookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{b.booking_ref || '—'}</td>
                      <td style={tdStyle}>{b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : '—'}</td>
                      <td style={tdStyle}>{(b.origin || '?') + ' → ' + (b.destination || '?')}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.blue }}>€{(b.customer_paid || b.total_amount || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {role === 'admin' && detail.user_id && (
              <button
                type="button"
                onClick={() => { setCreditTarget({ userId: detail.user_id, name: detail.name || detail.email }); setDetail(null); }}
                style={{ ...primaryBtnStyle, width: '100%', marginBottom: 8 }}
              >
                💳 إضافة رصيد
              </button>
            )}
            <a
              href={`mailto:${encodeURIComponent(detail.email || '')}?subject=${encodeURIComponent('Airpiv — بخصوص حجوزاتك')}&body=${encodeURIComponent(`مرحباً ${detail.name || ''},\n\n`)}`}
              style={{ ...primaryBtnStyle, width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
            >
              ✉️ إرسال إيميل للعميل
            </a>
          </div>
        </div>
      )}

      {creditTarget && (
        <CreditModal
          userId={creditTarget.userId}
          name={creditTarget.name}
          onClose={() => setCreditTarget(null)}
          onDone={() => setCreditTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: color || ADMIN_COLORS.tx }}>{value}</div>
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function DetailItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  );
}

function badgeStyle(color) {
  return { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color, background: `${color}22` };
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 50,
};
const modalStyle = {
  width: '100%', maxWidth: 640, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const closeBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.tx2, cursor: 'pointer', fontSize: 16 };
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const smallThStyle = { textAlign: 'right', padding: '8px', color: ADMIN_COLORS.tx3, fontSize: 11 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 13, padding: 0 };
