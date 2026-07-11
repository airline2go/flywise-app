'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function emptyConfig() {
  return { welcomeCreditEur: 10, welcomePoints: 100, pointsPerEuro: 2, maxCreditPerBooking: 5, tiers: [] };
}

export default function LoyaltyClient() {
  const [config, setConfig] = useState(emptyConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/loyalty-config');
    const data = await res.json();
    if (data.ok) setConfig(data.config);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function updateTier(i, field, value) {
    const next = config.tiers.slice();
    next[i] = { ...next[i], [field]: value };
    setConfig((c) => ({ ...c, tiers: next }));
  }
  function removeTier(i) {
    setConfig((c) => ({ ...c, tiers: c.tiers.filter((_, idx) => idx !== i) }));
  }
  function addTier() {
    const last = config.tiers[config.tiers.length - 1];
    const lastTo = last ? (last.to || last.from + 100) : 0;
    setConfig((c) => ({ ...c, tiers: [...c.tiers, { from: lastTo, to: null, creditEur: 5 }] }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/admin/api/loyalty-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) { setConfig(data.config); setBanner({ type: 'success', text: 'تم حفظ التغييرات ✅' }); }
    else setBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>إعدادات الولاء</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>كل قواعد برنامج الولاء — الرصيد الفعلي لكل عميل محفوظ بالسيرفر، هذه الإعدادات تتحكم بالقواعد فقط</p>
        </div>
        <button type="button" disabled={saving} onClick={save} style={primaryBtnStyle}>💾 حفظ التغييرات</button>
      </div>

      {banner && (
        <div style={{ ...bannerStyle(banner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        <SettingCard title="مكافأة الترحيب" desc="تُمنح تلقائياً لأول مرة يُكتشف فيها متصفح/جهاز جديد">
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              رصيد ترحيبي (€)
              <input type="number" step={0.5} min={0} value={config.welcomeCreditEur} onChange={(e) => setConfig((c) => ({ ...c, welcomeCreditEur: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              نقاط ترحيبية
              <input type="number" min={0} value={config.welcomePoints} onChange={(e) => setConfig((c) => ({ ...c, welcomePoints: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </label>
          </div>
        </SettingCard>
        <SettingCard title="كسب النقاط والسقف" desc="نقاط لكل يورو مدفوع، وأقصى رصيد يمكن استخدامه بحجز واحد">
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              نقاط لكل €1
              <input type="number" step={0.5} min={0} value={config.pointsPerEuro} onChange={(e) => setConfig((c) => ({ ...c, pointsPerEuro: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              أقصى خصم لكل حجز (€)
              <input type="number" step={0.5} min={0} value={config.maxCreditPerBooking} onChange={(e) => setConfig((c) => ({ ...c, maxCreditPerBooking: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </label>
          </div>
        </SettingCard>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>شرائح الخصم القابل للاستخدام</div>
            <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 3 }}>كم خصم يمكن للعميل استخدامه حسب إجمالي سعر حجزه — مهما كان رصيده الفعلي أكبر، السيرفر يفرض الأصغر بين هذا والرصيد الحقيقي والسقف أعلاه</div>
          </div>
          <button type="button" onClick={addTier} style={ghostBtnStyle}>+ إضافة شريحة</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'center', padding: '8px 12px', marginBottom: 4 }}>
            <div style={colLabelStyle}>من (€)</div>
            <div style={colLabelStyle}>إلى (€)</div>
            <div style={colLabelStyle}>خصم قابل للاستخدام (€)</div>
            <div />
          </div>
          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {config.tiers.map((tier, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'center', background: ADMIN_COLORS.bg3, borderRadius: 10, padding: 12, border: `1px solid ${ADMIN_COLORS.border}` }}>
                  <input type="number" value={tier.from} min={0} onChange={(e) => updateTier(i, 'from', parseFloat(e.target.value) || 0)} style={tierInputStyle} />
                  <input type="number" value={tier.to ?? ''} min={0} placeholder="∞" onChange={(e) => updateTier(i, 'to', e.target.value === '' ? null : parseFloat(e.target.value))} style={tierInputStyle} />
                  <input type="number" value={tier.creditEur} min={0} onChange={(e) => updateTier(i, 'creditEur', parseFloat(e.target.value) || 0)} style={{ ...tierInputStyle, color: ADMIN_COLORS.teal }} />
                  <button type="button" onClick={() => removeTier(i)} title="حذف الشريحة" style={dangerIconBtnStyle}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingCard({ title, desc, children }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginBottom: 12 }}>{desc}</div>
      {children}
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
const tierInputStyle = { ...inputStyle, marginTop: 0, fontFamily: 'monospace' };
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const ghostBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const dangerIconBtnStyle = {
  background: 'none', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, width: 34, height: 34,
  cursor: 'pointer', color: ADMIN_COLORS.red, fontSize: 14,
};
const colLabelStyle = { fontSize: 10, fontWeight: 700, color: ADMIN_COLORS.tx3, textTransform: 'uppercase', letterSpacing: 0.5 };
