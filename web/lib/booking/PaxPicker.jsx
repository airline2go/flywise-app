'use client';

// Ports the real #pov/.pm passenger modal exactly — including the
// original's own quirk of never translating this modal (no data-i18n
// anywhere in it in index.html), so the copy stays German regardless
// of site language, faithfully, not "fixed" into a multi-language modal.
import { useState } from 'react';

export default function PaxPicker({ pax, onChange, onClose }) {
  const [local, setLocal] = useState(pax);

  function step(key, delta) {
    setLocal((prev) => {
      const next = { ...prev };
      if (key === 'adults') {
        next.adults = Math.max(1, Math.min(9, prev.adults + delta));
        if (next.infants > next.adults) next.infants = next.adults;
      } else if (key === 'infants') {
        next.infants = Math.max(0, Math.min(prev.adults, prev.infants + delta));
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
    <div className="ov open" onClick={onClose}>
      <div className="pm" onClick={(e) => e.stopPropagation()}>
        <div className="mhd"><h3>Reisende &amp; Gepäck</h3><button type="button" className="mx" onClick={onClose}>✕</button></div>

        <Row label="Erwachsene" sub="ab 12 Jahre" value={local.adults} onDec={() => step('adults', -1)} onInc={() => step('adults', 1)} />
        <Row label="Kinder" sub="2–11 Jahre" value={local.children} onDec={() => step('children', -1)} onInc={() => step('children', 1)} />
        <Row label="Kleinkinder" sub="unter 2 Jahre" value={local.infants} onDec={() => step('infants', -1)} onInc={() => step('infants', 1)} />
        <div className="prow" style={{ borderTop: '2px solid var(--bg2)', marginTop: 4, paddingTop: 14 }}>
          <div><div className="plbl">🧳 Aufgabegepäck</div><div className="psub">Pro Person</div></div>
          <div className="pctrl">
            <button type="button" className="pcb" onClick={() => step('checkedBags', -1)}>−</button>
            <span className="pnum">{local.checkedBags}</span>
            <button type="button" className="pcb" onClick={() => step('checkedBags', 1)}>+</button>
          </div>
        </div>
        <div className="prow">
          <div><div className="plbl">🎒 Handgepäck</div><div className="psub">bis 10kg · Kabine</div></div>
          <div className="pctrl">
            <button type="button" className="pcb" onClick={() => step('cabinBags', -1)}>−</button>
            <span className="pnum">{local.cabinBags}</span>
            <button type="button" className="pcb" onClick={() => step('cabinBags', 1)}>+</button>
          </div>
        </div>
        <div className="prow" style={{ border: 'none' }}>
          <div className="plbl">Klasse</div>
          <select className="pmsel" value={local.cabin} onChange={(e) => setLocal((p) => ({ ...p, cabin: e.target.value }))}>
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>

        <button type="button" className="pmdone" onClick={done}>Fertig ✓</button>
      </div>
    </div>
  );
}

function Row({ label, sub, value, onDec, onInc }) {
  return (
    <div className="prow">
      <div><div className="plbl">{label}</div><div className="psub">{sub}</div></div>
      <div className="pctrl">
        <button type="button" className="pcb" onClick={onDec}>−</button>
        <span className="pnum">{value}</span>
        <button type="button" className="pcb" onClick={onInc}>+</button>
      </div>
    </div>
  );
}
