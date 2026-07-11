'use client';

// Ports app.js's buildCard() — airline logo/name, times, a visual
// stops indicator, duration, price, and a "select" CTA — as JSX instead
// of string-concatenated innerHTML. One leg-rendering block reused for
// every leg (outbound/inbound/multi-city legs), collapsing what was
// two separate near-duplicate render blocks in the original.
import { offerLegs, offerIsRefundable, fmtDuration, fmtTime, fmtPrice } from './offerUtils';

function airlineLogoUrl(code) {
  return `https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${code}.svg`;
}

function Leg({ leg }) {
  const dayShift = new Date(leg.arr).getDate() !== new Date(leg.dep).getDate();
  return (
    <div style={legRowStyle}>
      <img
        src={airlineLogoUrl(leg.segs[0].al[0])}
        alt={leg.segs[0].al[1]}
        width={28} height={28}
        style={logoStyle}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtTime(leg.dep)}</span>
          <span style={durLineStyle}>
            {fmtDuration(leg.dur)}
            <span style={dotLineStyle}>{'●'.repeat(leg.stops + 1)}</span>
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtTime(leg.arr)}{dayShift ? <sup>+1</sup> : null}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>
          <span>{leg.orig}</span>
          <span>{leg.stops === 0 ? 'Direktflug' : `${leg.stops} Stopp${leg.stops > 1 ? 's' : ''}`} · {leg.segs[0].al[1]}</span>
          <span>{leg.dest}</span>
        </div>
      </div>
    </div>
  );
}

export default function OfferCard({ offer, isBestValue, onSelect, paxCount }) {
  const legs = offerLegs(offer);
  const refundable = offerIsRefundable(offer);

  return (
    <div style={cardStyle}>
      {isBestValue && <div style={ribbonStyle}>✦ BESTE WAHL</div>}

      {legs.map((leg, i) => (
        <div key={i}>
          {i > 0 && <hr style={sepStyle} />}
          <Leg leg={leg} />
        </div>
      ))}

      <div style={footRowStyle}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--tx3)' }}>
          <span style={{ opacity: offer.hasCabin ? 1 : 0.4 }}>🎒 {offer.cabinBagQty ?? (offer.hasCabin ? 1 : 0)}</span>
          <span style={{ opacity: offer.hasChecked ? 1 : 0.4 }}>🧳 {offer.checkedBagQty ?? (offer.hasChecked ? 1 : 0)}</span>
          {refundable && <span style={badgeStyle}>↩ Erstattbar</span>}
          {offer.fare_brand_name && <span style={badgeStyle}>{offer.fare_brand_name}</span>}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{fmtPrice(offer.price, offer.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{paxCount > 1 ? `gesamt (${paxCount} Pax)` : 'pro Person'}</div>
        </div>
      </div>

      <button type="button" onClick={() => onSelect(offer)} style={selectBtnStyle}>Buchen →</button>
    </div>
  );
}

const cardStyle = {
  position: 'relative', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
  padding: 16, marginBottom: 12,
};
const ribbonStyle = {
  position: 'absolute', top: -1, insetInlineStart: 14, background: 'var(--teal)', color: '#fff',
  fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: '0 0 6px 6px', letterSpacing: 0.3,
};
const legRowStyle = { display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' };
const logoStyle = { objectFit: 'contain', flexShrink: 0 };
const durLineStyle = { fontSize: 11, color: 'var(--tx3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 };
const dotLineStyle = { fontSize: 6, letterSpacing: 2, color: 'var(--bd2)' };
const sepStyle = { border: 'none', borderTop: '1px dashed var(--bd)', margin: '8px 0' };
const footRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bd)' };
const badgeStyle = { background: 'var(--teal-lt)', color: 'var(--teal2)', borderRadius: 6, padding: '2px 7px', fontWeight: 700 };
const selectBtnStyle = {
  width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 'var(--r-sm)', border: 'none',
  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
