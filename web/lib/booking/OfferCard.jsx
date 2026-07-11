'use client';

// Ports app.js's buildCard() exactly — same classes (.fc/.sl-line/.ftr/
// .farp/.stops-under/.fc-foot/.bag-row/.fc-actions/etc.) from styles.css,
// same visual composition, not a redesign.
//
// [SIMPLIFIED] The connecting-airport city-name lookup in the stops
// badge ("2 Stopps · FRA, Frankfurt") used app.js's client-bundled `AP`
// airport array (200+ hardcoded entries) purely for the display name —
// this shows just the IATA code(s) instead of also resolving the city
// name, since porting that whole static array is out of scope for this
// pass. Everything else in the card (times, duration, price, baggage,
// fare badges) is unaffected and exact.
import { offerLegs, offerIsRefundable, fmtDuration, fmtTime, fmtPrice } from './offerUtils';
import { getAirlineColor, getAirlineTextColor } from './airlineColors';

function stopsDots(stops) {
  const dots = [];
  if (stops === 0) { dots.push(<div key="s" className="fts" />); return dots; }
  for (let i = 0; i < stops; i++) {
    dots.push(<div key={`s${i}`} className="fts" />);
    dots.push(<div key={`d${i}`} className="ftd" />);
  }
  dots.push(<div key="sl" className="fts" />);
  return dots;
}

function connectingCodes(segs) {
  if (!segs || segs.length < 2) return '';
  return segs.slice(0, -1).map((s) => s.to).filter(Boolean).join(', ');
}

function StopsBadge({ leg }) {
  if (leg.stops === 0) return <span className="fbdg fb-d">Direktflug</span>;
  const codes = connectingCodes(leg.segs);
  return <span className="fbdg fb-s">{leg.stops} {leg.stops > 1 ? 'Stopps' : 'Stopp'}{codes ? ` · ${codes}` : ''}</span>;
}

function AirlineLogo({ code }) {
  const color = getAirlineColor(code);
  return (
    <div className="al-logo" data-code={code} data-color={color}>
      <img
        src={`https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${code}.svg`}
        alt={code} loading="lazy"
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = 'none';
          const parent = img.parentNode;
          if (!parent) return;
          parent.style.background = color;
          parent.style.borderRadius = '9px';
          parent.style.display = 'flex';
          parent.style.alignItems = 'center';
          parent.style.justifyContent = 'center';
          parent.style.color = getAirlineTextColor(code);
          const span = document.createElement('span');
          span.className = 'al-badge';
          span.textContent = code;
          parent.appendChild(span);
        }}
      />
    </div>
  );
}

function LegLine({ leg }) {
  const dayShift = new Date(leg.arr).getDate() !== new Date(leg.dep).getDate();
  return (
    <>
      <div className="sl-line">
        <AirlineLogo code={leg.segs[0].al[0]} />
        <div className="sl-t">
          <div className="sl-r">
            <span className="ft">{fmtTime(leg.dep)}</span>
            <div className="ftr"><div className="ftrb">{stopsDots(leg.stops)}</div></div>
            <span className="ft">{fmtTime(leg.arr)}{dayShift && <sup>+1</sup>}</span>
          </div>
          <div className="farp"><span>{leg.segs[0].from || leg.orig}</span><span>{leg.segs[leg.segs.length - 1].to || leg.dest}</span></div>
        </div>
        <div className="sl-dur"><strong>{fmtDuration(leg.dur)}</strong></div>
      </div>
      <div className="stops-under">
        <StopsBadge leg={leg} />
        <div className="sl-airline">{leg.segs[0].al[1]}</div>
      </div>
    </>
  );
}

export default function OfferCard({ offer, index, isBestValue, onSelect, paxCount }) {
  const legs = offerLegs(offer);
  const refundable = offerIsRefundable(offer);
  const cabinBagQty = typeof offer.cabinBagQty === 'number' ? offer.cabinBagQty : (offer.hasCabin ? 1 : 0);
  const checkedBagQty = typeof offer.checkedBagQty === 'number' ? offer.checkedBagQty : (offer.hasChecked ? 1 : 0);

  return (
    <div className={`fc${isBestValue ? ' best-val' : ''}`} id={`fc${index}`}>
      {isBestValue && <div className="best-lbl">✦ BESTE WAHL</div>}
      <div className="fc-body" onClick={() => onSelect(offer)}>
        {legs.map((leg, i) => (
          <div key={i}>
            {i > 0 && <hr className="fc-sep" />}
            <LegLine leg={leg} />
          </div>
        ))}
      </div>

      <div className="fc-foot">
        <div className="bag-row">
          <div className={`bag-i${cabinBagQty > 0 ? '' : ' no'}`}>
            {cabinBagQty}
            <svg width="18" height="20" viewBox="0 0 24 28"><rect x="9" y="2" width="6" height="6" rx="2" fill="#9aa6b2" /><rect x="3" y="6" width="18" height="20" rx="3" fill="#1a2233" /><rect x="9" y="13" width="9" height="2.4" rx="1.2" fill="#9aa6b2" /><rect x="9" y="17" width="6" height="6" rx="1.5" fill="#9aa6b2" /></svg>
          </div>
          <div className={`bag-i${checkedBagQty > 0 ? '' : ' no'}`}>
            {checkedBagQty}
            <svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="2" width="6" height="4" rx="1.5" fill="#1a2233" /><rect x="2" y="4" width="20" height="17" rx="3" fill="#1a2233" /><rect x="6" y="7" width="2.2" height="11" fill="#fff" /><rect x="10" y="7" width="2.2" height="11" fill="#fff" /><rect x="14" y="7" width="2.2" height="11" fill="#fff" /><rect x="18" y="7" width="2.2" height="11" fill="#fff" /><circle cx="8" cy="22.5" r="1.5" fill="#1a2233" /><circle cx="16" cy="22.5" r="1.5" fill="#1a2233" /></svg>
          </div>
          {refundable && <div className="fare-badge fare-ref">↩ Erstattbar</div>}
          {offer.fare_brand_name && <div className="fare-badge" style={{ background: 'var(--bg2)', color: 'var(--tx3)' }}>{offer.fare_brand_name}</div>}
        </div>
        <div className="fc-actions">
          <div className="fp-wrap">
            <div className="famt">{fmtPrice(offer.price)}</div>
            <div className="fpsub">{paxCount > 1 ? `gesamt (${paxCount} Pax)` : 'pro Person'}</div>
          </div>
          <div className="fc-btns">
            <button type="button" className="bkbtn" onClick={() => onSelect(offer)}>Buchen →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
