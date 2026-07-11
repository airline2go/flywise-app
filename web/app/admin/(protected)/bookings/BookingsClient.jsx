'use client';

import { useCallback, useEffect, useState } from 'react';
import InvoiceIssueModal from '../../../../lib/admin/InvoiceIssueModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function statusBadge(status) {
  if (status === 'confirmed') return <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ مؤكد</span>;
  if (status === 'pending') return <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ معلق</span>;
  if (status === 'cancelled') return <span style={badgeStyle(ADMIN_COLORS.red)}>✕ ملغى</span>;
  return <span style={badgeStyle(ADMIN_COLORS.tx3)}>{status || '—'}</span>;
}

function exportCSV(bookings) {
  if (!bookings.length) { alert('لا توجد بيانات'); return; }
  const headers = ['booking_reference', 'created_at', 'route_label', 'duffel_amount', 'discount_amount', 'profit_margin', 'customer_paid', 'status', 'promo_code', 'customer_email'];
  const rows = bookings.map((b) => headers.map((h) => {
    const v = b[h] == null ? '' : String(b[h]);
    return v.indexOf(',') >= 0 ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv;charset=utf-8,﻿${encodeURIComponent(csv)}`;
  a.download = `airpiv-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function BookingsClient() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [issues, setIssues] = useState({ sync: [], failures: [], cancellations: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/bookings?limit=200');
    const data = await res.json();
    if (data.ok) setBookings(data.bookings || []);
    setLoading(false);
  }, []);

  const loadIssues = useCallback(async () => {
    const [cancelRes, failureRes, syncRes] = await Promise.all([
      fetch('/admin/api/cancellations'),
      fetch('/admin/api/booking-failures'),
      fetch('/admin/api/sync-failures'),
    ]);
    const [cancelData, failureData, syncData] = await Promise.all([cancelRes.json(), failureRes.json(), syncRes.json()]);
    setIssues({
      cancellations: cancelData.ok ? (cancelData.events || []).slice(0, 5) : [],
      failures: failureData.ok ? (failureData.events || []).slice(0, 5) : [],
      sync: syncData.ok ? (syncData.events || []).slice(0, 5) : [],
    });
  }, []);

  // [BOOKING-FAILURE-NOTIFY] Opening this tab marks all three notification
  // types read — matches admin.js's showPage('bookings') side effect.
  useEffect(() => {
    const t = setTimeout(() => {
      load();
      loadIssues();
      Promise.all([
        fetch('/admin/api/cancellations/mark-read', { method: 'POST' }),
        fetch('/admin/api/booking-failures/mark-read', { method: 'POST' }),
        fetch('/admin/api/sync-failures/mark-read', { method: 'POST' }),
      ]);
    }, 0);
    return () => clearTimeout(t);
  }, [load, loadIssues]);

  async function resolveSyncFailure(orderId) {
    if (!confirm('تأكيد: تحققت من Duffel مباشرة وهذا الحجز ملغي فعلاً؟ سيتم تحديث الحالة بقاعدتنا الآن.')) return;
    const res = await fetch(`/admin/api/sync-failures/${encodeURIComponent(orderId)}/resolve`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) { loadIssues(); load(); }
    else alert(data.error || 'فشل التحديث');
  }

  async function cancelBooking(id) {
    if (!confirm('تأكيد إلغاء هذا الحجز من السجلات؟ (هذا لا يلغي التذكرة فعلياً مع شركة الطيران)')) return;
    const res = await fetch(`/admin/api/bookings/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل الإلغاء');
  }

  const f = search.trim().toLowerCase();
  const visible = f
    ? bookings.filter((b) =>
        (b.booking_reference || '').toLowerCase().includes(f) ||
        (b.route_label || '').toLowerCase().includes(f) ||
        (b.customer_email || '').toLowerCase().includes(f))
    : bookings;

  const hasIssues = issues.sync.length || issues.failures.length || issues.cancellations.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>الحجوزات</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>كل تفاصيل الحجوزات والأرباح</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث برقم الحجز أو المسافر..."
            style={{ minWidth: 240, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
          />
          <button type="button" onClick={() => exportCSV(bookings)} style={ghostBtnStyle}>📥 تصدير CSV</button>
        </div>
      </div>

      {hasIssues ? (
        <div style={{ marginBottom: 18 }}>
          {issues.sync.map((ev) => (
            <div key={ev.order_id} style={{ background: ADMIN_COLORS.bg2, border: '1.5px solid #7c3aed', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 13, marginBottom: 6 }}>⚠️ مزامنة مفقودة — العملية نجحت فعلاً لكن قاعدتنا لم تتحدث</div>
              <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 4 }}>{ev.message || ''}</div>
              {ev.booking && <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, marginBottom: 4 }}>{ev.booking.route_label || ''} · {ev.booking.customer_email || ''} · {ev.refund_amount || '—'}</div>}
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginBottom: 8, fontFamily: 'monospace' }}>Order: {ev.order_id || '—'} · {new Date(ev.at).toLocaleString('ar')}</div>
              <button type="button" onClick={() => resolveSyncFailure(ev.order_id)} style={smallGhostBtnStyle}>✓ تأكيد: تمت المزامنة يدوياً</button>
            </div>
          ))}
          {issues.failures.map((ev, i) => (
            <div key={i} style={{ background: ADMIN_COLORS.bg2, border: '1px solid #dc2626', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>🆘 فشل حجز بعد الدفع</div>
                {ev.refunded ? <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ تم الاسترجاع</span> : <span style={badgeStyle('#dc2626')}>⚠ لم يُسترجع — تحقق فوراً</span>}
              </div>
              <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 4 }}>{ev.message || 'سبب غير معروف'}</div>
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, fontFamily: 'monospace' }}>Session: {ev.session_id || '—'} · {new Date(ev.at).toLocaleString('ar')}</div>
            </div>
          ))}
          {issues.cancellations.map((ev, i) => (
            <div key={i} style={{ background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>✕ إلغاء حجز من العميل</div>
              <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2 }}>{ev.booking ? `${ev.booking.route_label || ''} · ${ev.booking.customer_email || ''}` : 'تفاصيل الحجز غير متوفرة'}</div>
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4, fontFamily: 'monospace' }}>{new Date(ev.at).toLocaleString('ar')}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: ADMIN_COLORS.bg3 }}>
              <th style={thStyle}>رقم الحجز</th>
              <th style={thStyle}>التاريخ</th>
              <th style={thStyle}>الرحلة</th>
              <th style={thStyle}>سعر Duffel</th>
              <th style={thStyle}>خصم</th>
              <th style={thStyle}>دفع العميل</th>
              <th style={thStyle}>الربح</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={emptyCellStyle}>...جارٍ التحميل</td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={9} style={emptyCellStyle}>لا توجد نتائج</td></tr>}
            {!loading && visible.map((b) => (
              <tr key={b.id} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{b.booking_reference || '—'}</td>
                <td style={tdStyle}>{b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : '—'}</td>
                <td style={tdStyle}>{b.route_label || '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>€{(Number(b.duffel_amount) || 0).toFixed(2)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.yellow }}>{(Number(b.discount_amount) || 0) > 0 ? `-€${Number(b.discount_amount).toFixed(2)}` : '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.blue }}>€{(Number(b.customer_paid) || 0).toFixed(2)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.teal }}>€{(Number(b.profit_margin) || 0).toFixed(2)}</td>
                <td style={tdStyle}>{statusBadge(b.status)}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => setDetail(b)} style={linkBtnStyle}>تفاصيل</button>
                  {b.status === 'confirmed' && (
                    <button type="button" onClick={() => cancelBooking(b.id)} style={{ ...linkBtnStyle, marginInlineStart: 10 }}>إلغاء</button>
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
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>حجز #{detail.booking_reference || '—'}</h2>
              <button type="button" onClick={() => setDetail(null)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>معلومات الرحلة</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              <DetailItem label="المسار" value={detail.route_label || '—'} />
              <DetailItem label="عدد الركاب" value={Number(detail.passenger_count) || 1} />
              <DetailItem label="البريد الإلكتروني" value={detail.customer_email || '—'} />
              <DetailItem label="تاريخ الحجز" value={detail.created_at ? new Date(detail.created_at).toLocaleDateString('ar') : '—'} />
              <DetailItem label="اسم العميل" value={detail.customer_name || '—'} />
              <DetailItem label="رقم الهاتف" value={detail.customer_phone || '—'} mono />
              <DetailItem label="تاريخ الميلاد" value={detail.customer_dob ? new Date(detail.customer_dob).toLocaleDateString('ar') : '—'} />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>التفاصيل المالية</div>
            <div style={{ background: ADMIN_COLORS.bg3, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <FinanceRow label="سعر التذكرة (Duffel)" value={`€${(Number(detail.duffel_amount) || 0).toFixed(2)}`} />
              <FinanceRow label="هامش الربح" value={`+€${(Number(detail.profit_margin) || ((Number(detail.customer_paid) || 0) - (Number(detail.duffel_amount) || 0))).toFixed(2)}`} color={ADMIN_COLORS.teal} />
              {(Number(detail.discount_amount) || 0) > 0 && (
                <FinanceRow label={`خصم كود ${detail.promo_code ? `(${detail.promo_code})` : ''}`} value={`-€${Number(detail.discount_amount).toFixed(2)}`} color={ADMIN_COLORS.yellow} />
              )}
              <FinanceRow label="دفع العميل" value={`€${(Number(detail.customer_paid) || 0).toFixed(2)}`} bold />
            </div>

            {detail.duffel_order_id && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Duffel</div>
                <DetailItem label="Order ID" value={detail.duffel_order_id} mono small />
              </div>
            )}
            {detail.stripe_session_id && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Stripe</div>
                <DetailItem label="Session ID" value={detail.stripe_session_id} mono small />
              </div>
            )}

            {detail.status === 'confirmed' && (
              <button
                type="button"
                onClick={() => { setInvoiceTarget(detail); setDetail(null); }}
                style={{ ...primaryBtnStyle, width: '100%' }}
              >
                🧾 إصدار فاتورة ضريبية
              </button>
            )}
          </div>
        </div>
      )}

      {invoiceTarget && (
        <InvoiceIssueModal
          booking={invoiceTarget}
          onClose={() => setInvoiceTarget(null)}
          onIssued={() => setInvoiceTarget(null)}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value, mono, small }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3 }}>{label}</div>
      <div style={{ fontSize: small ? 11 : 13, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: mono ? 'break-all' : 'normal' }}>{value}</div>
    </div>
  );
}

function FinanceRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: color || ADMIN_COLORS.tx, fontSize: 13 }}>{value}</span>
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
  padding: '10px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', marginTop: 20,
};
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const smallGhostBtnStyle = {
  padding: '5px 12px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 11, cursor: 'pointer',
};
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 13, padding: 0 };
