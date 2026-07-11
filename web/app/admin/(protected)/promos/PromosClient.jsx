'use client';

import { useCallback, useEffect, useState } from 'react';
import EntityModal from '../../../../lib/admin/EntityModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function emptyForm() {
  return { code: '', type: 'percent', value: '', expiry: '', max: '0' };
}

export default function PromosClient() {
  const [promos, setPromos] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [promosRes, usageRes] = await Promise.all([
      fetch('/admin/api/promos'),
      fetch('/admin/api/promos/usage-log?limit=50'),
    ]);
    const promosData = await promosRes.json();
    const usageData = await usageRes.json();
    if (promosData.ok) setPromos(promosData.promos || []);
    if (usageData.ok) setUsage(usageData.usage || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  async function toggleActive(promo) {
    const res = await fetch(`/admin/api/promos/${promo.id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل التحديث');
  }

  async function handleDelete(promo) {
    if (!confirm('تأكيد حذف هذا الكود نهائياً؟')) return;
    const res = await fetch(`/admin/api/promos/${promo.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل الحذف');
  }

  async function save() {
    const code = form.code.trim().toUpperCase();
    const value = parseFloat(form.value);
    const max = parseInt(form.max, 10) || 0;
    if (!code || !value) { setError('أدخل الكود والقيمة'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetch('/admin/api/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: form.type, value, max_uses: max > 0 ? max : null, expires_at: form.expiry || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشل إنشاء الكود'); return; }
    setModalOpen(false);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>كودات الخصم</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>أنشئ وأدر كودات الترويج</p>
        </div>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>+ كود جديد</button>
      </div>

      {loading && <p style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>...جارٍ التحميل</p>}
      {!loading && promos.length === 0 && <p style={{ color: ADMIN_COLORS.tx3, fontSize: 13 }}>لا توجد كودات بعد</p>}
      {!loading && promos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
          {promos.map((p) => {
            const used = p.used_count || 0;
            const max = p.max_uses || 0;
            const pct = max > 0 ? Math.min(100, (used / max) * 100) : (used > 0 ? 50 : 0);
            const expired = p.expires_at && new Date(p.expires_at) < new Date();
            const inactive = !p.active;
            return (
              <div key={p.id} style={{ ...promoCardStyle, opacity: (expired || inactive) ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                  <button type="button" onClick={() => toggleActive(p)} title={p.active ? 'تعطيل' : 'تفعيل'} style={iconBtnStyle}>{p.active ? '⏸' : '▶'}</button>
                  <button type="button" onClick={() => handleDelete(p)} title="حذف" style={{ ...iconBtnStyle, color: ADMIN_COLORS.red }}>🗑</button>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{p.code}</div>
                <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 8, lineHeight: 1.8 }}>
                  💰 خصم: {p.type === 'percent' ? `${p.value}%` : `€${Number(p.value).toFixed(2)}`}<br />
                  📅 ينتهي: {p.expires_at ? new Date(p.expires_at).toLocaleDateString('ar') : 'غير محدد'}<br />
                  🔢 الحد: {max > 0 ? `${max} مرة` : 'غير محدود'}
                </div>
                <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, marginTop: 8 }}>{used} استخدام {max > 0 ? `من ${max}` : ''}</div>
                {max > 0 && (
                  <div style={{ height: 4, background: ADMIN_COLORS.bg, borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ADMIN_COLORS.teal }} />
                  </div>
                )}
                {expired && <div style={{ color: ADMIN_COLORS.red, fontSize: 11, marginTop: 6 }}>⚠️ منتهي الصلاحية</div>}
                {inactive && <div style={{ color: ADMIN_COLORS.tx3, fontSize: 11, marginTop: 6 }}>⏸ معطّل</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>سجل الاستخدام</div>
      <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: ADMIN_COLORS.bg3 }}>
              <th style={thStyle}>الكود</th>
              <th style={thStyle}>المستخدم</th>
              <th style={thStyle}>رقم الحجز</th>
              <th style={thStyle}>الخصم</th>
              <th style={thStyle}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {usage.length === 0 && <tr><td colSpan={5} style={emptyCellStyle}>لا يوجد سجل بعد</td></tr>}
            {usage.map((u, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{u.promo_code}</td>
                <td style={tdStyle}>{u.customer_email || '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{u.booking_reference || '—'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.yellow }}>-€{(Number(u.discount_amount) || 0).toFixed(2)}</td>
                <td style={tdStyle}>{u.created_at ? new Date(u.created_at).toLocaleDateString('ar') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <EntityModal
          title="كود خصم جديد"
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          onSubmit={save}
          submitting={submitting}
          error={error}
          extra={
            <>
              <label style={labelStyle}>
                الكود
                <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="SUMMER25" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  نوع الخصم
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    <option value="percent">نسبة مئوية %</option>
                    <option value="fixed">مبلغ ثابت €</option>
                  </select>
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  القيمة
                  <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="10" style={inputStyle} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  تاريخ الانتهاء
                  <input type="date" value={form.expiry} onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  عدد الاستخدامات (0 = غير محدود)
                  <input type="number" value={form.max} onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))} placeholder="0" style={inputStyle} />
                </label>
              </div>
            </>
          }
          footer={
            <button type="button" disabled={submitting} onClick={save} style={{ ...primaryBtnStyle, width: '100%', marginTop: 20 }}>
              {submitting ? '...' : '✅ إنشاء الكود'}
            </button>
          }
        />
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const promoCardStyle = {
  background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 16,
};
const iconBtnStyle = {
  background: 'none', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 6, width: 28, height: 28,
  cursor: 'pointer', color: ADMIN_COLORS.tx, fontSize: 13,
};
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
