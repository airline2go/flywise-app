'use client';

import { useCallback, useEffect, useState } from 'react';
import TierEditor from '../../../../lib/admin/TierEditor';
import { getMarginForPrice } from '../../../../lib/admin/tierMargin';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const DUFFEL_FIXED_FEE = 2.75;
const ISSUANCE_PCT = 0.01;

export default function ProfitClient() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [price, setPrice] = useState(200);
  const [discount, setDiscount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/profit-tiers');
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
    const res = await fetch('/admin/api/profit-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) { setTiers(data.tiers); setBanner({ type: 'success', text: 'تم حفظ التغييرات ✅' }); }
    else setBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  const { margin, tier } = getMarginForPrice(price, tiers);
  const duffelFee = DUFFEL_FIXED_FEE;
  const issuanceFee = price * ISSUANCE_PCT;
  const trueCost = price + duffelFee + issuanceFee;
  const customerPays = price + margin - discount;
  const netProfit = customerPays - trueCost;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>هامش الربح</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>حدّد هامش ربح مختلف لكل نطاق سعري — الشرائح تُطبَّق تلقائياً</p>
        </div>
        <button type="button" disabled={saving} onClick={save} style={primaryBtnStyle}>💾 حفظ التغييرات</button>
      </div>

      {banner && (
        <div style={{ ...bannerStyle(banner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <Card title="شرائح هامش الربح" sub="كل شريحة تنطبق على الحجوزات بين مبلغين — أضف أو احذف حسب رغبتك">
        {!loading && <TierEditor tiers={tiers} onChange={setTiers} />}
        <div style={hintBoxStyle}>
          <strong style={{ color: ADMIN_COLORS.tx2 }}>كيف تشتغل الشرائح؟</strong><br />
          مثال: إذا عندك شريحة من €0 إلى €200 بنسبة 8%+€5، وشريحة من €200 إلى €500 بنسبة 5%+€10 —<br />
          حجز بـ €350 سيطبق عليه الشريحة الثانية: (350 × 5%) + €10 = <strong style={{ color: ADMIN_COLORS.teal }}>€27.50</strong> هامش ربح
        </div>
      </Card>

      <Card title="حاسبة الربح التجريبية">
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: 140 }}>
            سعر التذكرة (€)
            <input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 140 }}>
            خصم كود (€)
            <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} style={inputStyle} />
          </label>
        </div>
        <div style={{ background: ADMIN_COLORS.bg3, borderRadius: 10, padding: 16 }}>
          <FinanceRow label="سعر Duffel" value={`€${price.toFixed(2)}`} />
          <FinanceRow label={<span>رسوم Duffel الثابتة <Tag>€2.75</Tag></span>} value={`-€${duffelFee.toFixed(2)}`} color={ADMIN_COLORS.red} muted />
          <FinanceRow label={<span>تكلفة إصدار التذكرة <Tag>1% من سعر Duffel</Tag></span>} value={`-€${issuanceFee.toFixed(2)}`} color={ADMIN_COLORS.red} muted />
          <FinanceRow label="التكلفة الفعلية علينا" value={`€${trueCost.toFixed(2)}`} muted border />
          <FinanceRow label="الشريحة المطبّقة" value={tier ? `€${tier.from} → ${tier.to !== null ? `€${tier.to}` : '∞'} | ${tier.pct}% + €${tier.fixed}` : 'لا توجد شريحة مطابقة'} small muted />
          <FinanceRow label="هامش الربح (إجمالي)" value={`€${margin.toFixed(2)}`} bold color={ADMIN_COLORS.teal} />
          <FinanceRow label="خصم الكود" value={`-€${discount.toFixed(2)}`} color={ADMIN_COLORS.yellow} />
          <FinanceRow label="يدفع العميل" value={`€${customerPays.toFixed(2)}`} bold border />
          <div style={{ marginTop: 10, padding: '10px 12px', background: ADMIN_COLORS.bg2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>صافي ربحك الحقيقي</span>
            <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: netProfit >= 0 ? ADMIN_COLORS.teal : ADMIN_COLORS.red }}>€{netProfit.toFixed(2)}</span>
          </div>
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

function Tag({ children }) {
  return <span style={{ fontSize: 10, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 4, padding: '1px 6px', color: ADMIN_COLORS.tx3, marginInlineStart: 6 }}>{children}</span>;
}

function FinanceRow({ label, value, color, bold, muted, small, border }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: border ? `1px solid ${ADMIN_COLORS.border}` : 'none', marginTop: border ? 4 : 0, paddingTop: border ? 8 : 6 }}>
      <span style={{ color: muted ? ADMIN_COLORS.tx2 : ADMIN_COLORS.tx, fontSize: small ? 11 : 13, display: 'flex', alignItems: 'center' }}>{label}</span>
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
