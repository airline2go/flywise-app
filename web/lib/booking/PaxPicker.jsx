'use client';

// Ports app.js's passenger/cabin-class popover (#pov / chp() / savePax()):
// +/- counters with cross-field validation — infants can't exceed
// adults (each infant needs an adult on their lap), reducing adults
// below the infant count clamps infants down too, cabin-bag count is
// clamped to 0-1. Persisted to fw_pax by SearchProvider itself, not
// here — this component only edits the in-memory value.
import { useState } from 'react';

const CABIN_OPTIONS = [
  ['economy', 'cabinEconomy'],
  ['premium_economy', 'cabinPremiumEconomy'],
  ['business', 'cabinBusiness'],
  ['first', 'cabinFirst'],
];

export default function PaxPicker({ pax, onChange, onClose, t }) {
  const [local, setLocal] = useState(pax);
  const [warning, setWarning] = useState('');

  function step(key, delta) {
    setWarning('');
    setLocal((prev) => {
      const next = { ...prev };
      if (key === 'adults') {
        next.adults = Math.max(1, Math.min(9, prev.adults + delta));
        if (next.infants > next.adults) { next.infants = next.adults; setWarning(t.paxInfantsExceedAdults); }
      } else if (key === 'infants') {
        const capped = Math.max(0, Math.min(prev.adults, prev.infants + delta));
        if (delta > 0 && capped === prev.infants) setWarning(t.paxInfantsExceedAdults);
        next.infants = capped;
      } else if (key === 'children') {
        next.children = Math.max(0, Math.min(9, prev.children + delta));
      } else if (key === 'checkedBags') {
        next.checkedBags = Math.max(0, Math.min(9, prev.checkedBags + delta));
      } else if (key === 'cabinBags') {
        next.cabinBags = Math.max(0, Math.min(1, prev.cabinBags + delta));
      }
      return next;
    });
  }

  function done() {
    onChange(local);
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={done}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <Counter label={t.paxAdults} value={local.adults} onDec={() => step('adults', -1)} onInc={() => step('adults', 1)} />
        <Counter label={t.paxChildren} value={local.children} onDec={() => step('children', -1)} onInc={() => step('children', 1)} />
        <Counter label={t.paxInfants} value={local.infants} onDec={() => step('infants', -1)} onInc={() => step('infants', 1)} />
        <Counter label={t.paxCheckedBags} value={local.checkedBags} onDec={() => step('checkedBags', -1)} onInc={() => step('checkedBags', 1)} />
        <Counter label={t.paxCabinBags} value={local.cabinBags} onDec={() => step('cabinBags', -1)} onInc={() => step('cabinBags', 1)} />

        {warning && <div style={warningStyle}>{warning}</div>}

        <label style={selectLabelStyle}>
          {t.paxCabinClass}
          <select value={local.cabin} onChange={(e) => setLocal((p) => ({ ...p, cabin: e.target.value }))} style={selectStyle}>
            {CABIN_OPTIONS.map(([value, key]) => <option key={value} value={value}>{t[key]}</option>)}
          </select>
        </label>

        <button type="button" onClick={done} style={doneBtnStyle}>{t.paxDoneButton}</button>
      </div>
    </div>
  );
}

function Counter({ label, value, onDec, onInc }) {
  return (
    <div style={rowStyle}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={onDec} style={stepBtnStyle}>−</button>
        <span style={{ minWidth: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <button type="button" onClick={onInc} style={stepBtnStyle}>+</button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px', overflowY: 'auto', zIndex: 60,
};
const panelStyle = {
  width: '100%', maxWidth: 340, background: 'var(--bg)', border: '1px solid var(--bd)',
  borderRadius: 'var(--r)', padding: 18, boxShadow: '0 12px 32px rgba(0,0,0,.2)',
};
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--bd)' };
const stepBtnStyle = {
  width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--bd)', background: 'var(--bg)',
  color: 'var(--tx)', fontSize: 16, cursor: 'pointer', lineHeight: 1,
};
const warningStyle = { color: 'var(--rd)', fontSize: 12, marginTop: 8 };
const selectLabelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--tx2)', marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 };
const selectStyle = {
  display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 14,
};
const doneBtnStyle = {
  width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 'var(--r-sm)', border: 'none',
  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
