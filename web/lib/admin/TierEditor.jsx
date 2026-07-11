'use client';

import { ADMIN_COLORS } from './theme';

// [ADMIN-MARGIN] The exact same UI/logic powers both the ticket-margin
// (Profit) page and the ancillary seat/baggage-margin page — tiers are
// { from, to (null = infinite), pct, fixed }, matching the server's
// validateTiersPayload() shape exactly.
export default function TierEditor({ tiers, onChange }) {
  function updateTier(i, field, value) {
    const next = tiers.slice();
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }
  function removeTier(i) {
    onChange(tiers.filter((_, idx) => idx !== i));
  }
  function addTier() {
    const last = tiers[tiers.length - 1];
    const lastTo = last ? (last.to || last.from + 100) : 0;
    onChange([...tiers, { from: lastTo, to: null, pct: 5, fixed: 1 }]);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center', padding: '8px 12px', marginBottom: 4 }}>
        <div style={colLabelStyle}>من (€)</div>
        <div style={colLabelStyle}>إلى (€)</div>
        <div style={colLabelStyle}>نسبة %</div>
        <div style={colLabelStyle}>مبلغ ثابت €</div>
        <div />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tiers.map((tier, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center', background: ADMIN_COLORS.bg3, borderRadius: 10, padding: 12, border: `1px solid ${ADMIN_COLORS.border}` }}>
            <label>
              <span style={fieldLabelStyle}>من €</span>
              <input type="number" value={tier.from} min={0} onChange={(e) => updateTier(i, 'from', parseFloat(e.target.value) || 0)} style={inputStyle} />
            </label>
            <label>
              <span style={fieldLabelStyle}>إلى € (فارغ = ∞)</span>
              <input type="number" value={tier.to ?? ''} min={0} placeholder="∞" onChange={(e) => updateTier(i, 'to', e.target.value === '' ? null : parseFloat(e.target.value))} style={inputStyle} />
            </label>
            <label>
              <span style={fieldLabelStyle}>نسبة %</span>
              <input type="number" value={tier.pct} min={0} max={100} step={0.5} onChange={(e) => updateTier(i, 'pct', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, color: ADMIN_COLORS.teal }} />
            </label>
            <label>
              <span style={fieldLabelStyle}>مبلغ ثابت €</span>
              <input type="number" value={tier.fixed} min={0} step={0.5} onChange={(e) => updateTier(i, 'fixed', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, color: ADMIN_COLORS.blue }} />
            </label>
            <div style={{ paddingTop: 20 }}>
              <button type="button" onClick={() => removeTier(i)} title="حذف الشريحة" style={dangerIconBtnStyle}>🗑</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addTier} style={addBtnStyle}>+ إضافة شريحة</button>
    </div>
  );
}

const colLabelStyle = { fontSize: 10, fontWeight: 700, color: ADMIN_COLORS.tx3, textTransform: 'uppercase', letterSpacing: 0.5 };
const fieldLabelStyle = { fontSize: 10, color: ADMIN_COLORS.tx3, display: 'block', marginBottom: 4 };
const inputStyle = {
  display: 'block', width: '100%', padding: '9px 11px', fontFamily: 'monospace',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 13,
};
const dangerIconBtnStyle = {
  background: 'none', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, width: 34, height: 34,
  cursor: 'pointer', color: ADMIN_COLORS.red, fontSize: 14,
};
const addBtnStyle = {
  marginTop: 14, padding: '8px 16px', borderRadius: 8, border: `1px dashed ${ADMIN_COLORS.border}`,
  background: 'transparent', color: ADMIN_COLORS.tx2, fontSize: 12.5, cursor: 'pointer',
};
