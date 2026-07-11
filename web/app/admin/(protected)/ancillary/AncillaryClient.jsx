'use client';

import { useCallback, useEffect, useState } from 'react';
import TierEditor from '../../../../lib/admin/TierEditor';
import { getMarginForPrice } from '../../../../lib/admin/tierMargin';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

export default function AncillaryClient() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [price, setPrice] = useState(40);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/ancillary-margin');
    const data = await res.json();
    if (data.ok) setTiers(data.tiers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save() {
    setSaving(true);
    const res = await fetch('/admin/api/ancillary-margin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) { setTiers(data.tiers); setBanner({ type: 'success', text: 'تم حفظ شرائح هامش المقاعد والحقائب ✅' }); }
    else setBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  const { margin, tier } = getMarginForPrice(price, tiers);
  const customerPays = price + margin;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>هامش ربح المقاعد والحقائب</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>حدّد هامش ربح مختلف لكل نطاق سعري لخدمات المقاعد والحقائب الإضافية — يُطبَّق على سعر كل خدمة منفردة</p>
        </div>
        <button type="button" disabled={saving} onClick={save} style={primaryBtnStyle}>💾 حفظ التغييرات</button>
      </div>

      {banner && (
        <div style={{ ...bannerStyle(banner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <Card title="شرائح هامش المقاعد والحقائب" sub="كل شريحة تنطبق على سعر المقعد أو الحقيبة الواحدة (وليس إجمالي الحجز) — أضف أو احذف حسب رغبتك">
        {!loading && <TierEditor tiers={tiers} onChange={setTiers} />}
        <div style={hintBoxStyle}>
          <strong style={{ color: ADMIN_COLORS.tx2 }}>كيف تشتغل الشرائح هنا؟</strong><br />
          مثال: شريحة من €0 إلى €100 بنسبة 10%+€1 —<br />
          حقيبة سعرها €40 من Duffel: (40 × 10%) + €1 = <strong style={{ color: ADMIN_COLORS.teal }}>€5</strong> هامش ربح → العميل يدفع €45<br />
          مقعد سعره €150 (يقع بشريحة أعلى لو أضفتها) — كل خدمة تُحسب لحالها بسعرها الخاص، لا بإجمالي الحجز.
        </div>
      </Card>

      <Card title="حاسبة تجريبية — مقعد أو حقيبة واحدة">
        <label style={{ ...labelStyle, marginBottom: 16, display: 'block' }}>
          سعر المقعد/الحقيبة من Duffel (€)
          <input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
        </label>
        <div style={{ background: ADMIN_COLORS.bg3, borderRadius: 10, padding: 16 }}>
          <FinanceRow label="سعر Duffel الصافي" value={`€${price.toFixed(2)}`} />
          <FinanceRow label="الشريحة المطبّقة" value={tier ? `€${tier.from} → ${tier.to !== null ? `€${tier.to}` : '∞'} | ${tier.pct}% + €${tier.fixed}` : 'لا توجد شريحة مطابقة'} small muted />
          <FinanceRow label="هامش الربح" value={`€${margin.toFixed(2)}`} bold color={ADMIN_COLORS.teal} />
          <FinanceRow label="يدفع العميل" value={`€${customerPays.toFixed(2)}`} bold border />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function FinanceRow({ label, value, color, bold, muted, small, border }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: border ? `1px solid ${ADMIN_COLORS.border}` : 'none', marginTop: border ? 4 : 0, paddingTop: border ? 8 : 6 }}>
      <span style={{ color: muted ? ADMIN_COLORS.tx2 : ADMIN_COLORS.tx, fontSize: small ? 11 : 13 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: color || ADMIN_COLORS.tx, fontWeight: bold ? 700 : 400, fontSize: small ? 11 : 13 }}>{value}</span>
    </div>
  );
}

function bannerStyle(type) {
  const color = type === 'error' ? ADMIN_COLORS.red : ADMIN_COLORS.teal;
  const bg = type === 'error' ? ADMIN_COLORS.redBg : ADMIN_COLORS.tealGlow;
  return { color, background: bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 };
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const hintBoxStyle = {
  marginTop: 16, padding: '12px 14px', background: ADMIN_COLORS.bg, borderRadius: 8,
  border: `1px dashed ${ADMIN_COLORS.border}`, fontSize: 12, color: ADMIN_COLORS.tx3, lineHeight: 1.8,
};
