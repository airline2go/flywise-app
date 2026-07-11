'use client';

// Ports app.js's buildCard() exactly — same classes (.fc/.sl-line/.ftr/
// .farp/.stops-under/.fc-foot/.bag-row/.fc-actions/etc.) from styles.css,
// same visual composition, not a redesign. Tapping the card body opens the
// flight-detail bottom sheet (openFlightSheet); the ⌄ toggle opens the
// baggage-overview modal (toggleBagInfo); the share button ports
// shareFlight(); "Buchen" opens the booking flow (openBflow, wired in B3).
import { offerLegs, offerIsRefundable, fmtDuration, fmtTime, fmtPrice } from './offerUtils';
import { apByCode } from './airportData';
import { AirlineLogo } from './AirlineLogo';

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

// Ports buildCard()'s local f(segs) helper exactly: connecting-airport
// city name (always the German name, AP[r][2] — the original never
// localized this) with a fallback to the bare IATA code when the
// airport isn't in the small bundled AP array.
function connectingCodes(segs) {
  if (!segs || segs.length < 2) return '';
  return segs.slice(0, -1).map((s) => s.to).filter(Boolean).map((code) => {
    const entry = apByCode(code);
    return entry ? `${code}, ${entry[2]}` : code;
  }).join(', ');
}

function StopsBadge({ leg }) {
  if (leg.stops === 0) return <span className="fbdg fb-d">Direktflug</span>;
  const codes = connectingCodes(leg.segs);
  return <span className="fbdg fb-s">{leg.stops} {leg.stops > 1 ? 'Stopps' : 'Stopp'}{codes ? ` · ${codes}` : ''}</span>;
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

export default function OfferCard({ offer, index, isBestValue, lang = 'de', onSelect, onOpenDetail, onOpenBags, onShare, paxCount }) {
  const legs = offerLegs(offer);
  const refundable = offerIsRefundable(offer);
  const cabinBagQty = typeof offer.cabinBagQty === 'number' ? offer.cabinBagQty : (offer.hasCabin ? 1 : 0);
  const checkedBagQty = typeof offer.checkedBagQty === 'number' ? offer.checkedBagQty : (offer.hasChecked ? 1 : 0);

  return (
    <div className={`fc${isBestValue ? ' best-val' : ''}`} id={`fc${index}`}>
      {isBestValue && <div className="best-lbl">✦ BESTE WAHL</div>}
      <div className="fc-body" onClick={() => onOpenDetail(offer)}>
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
          <div className="bag-i" id={`bt${index}`} style={{ cursor: 'pointer', fontWeight: 800, transition: 'transform .15s', fontSize: 16 }} onClick={() => onOpenBags(offer)}>⌄</div>
          {refundable && <div className="fare-badge fare-ref">↩ Erstattbar</div>}
          {offer.fare_brand_name && <div className="fare-badge" style={{ background: 'var(--bg2)', color: 'var(--tx3)' }}>{offer.fare_brand_name}</div>}
        </div>
        <div className="fc-actions">
          <div className="fp-wrap">
            <div className="famt">{fmtPrice(offer.price, lang)}</div>
            <div className="fpsub">{paxCount > 1 ? `gesamt (${paxCount} Pax)` : 'pro Person'}</div>
          </div>
          <div className="fc-btns">
            <button type="button" className="bkbtn" onClick={() => onSelect(offer)}>Buchen →</button>
            <button type="button" className="share-btn" onClick={() => onShare(offer)} title="Teilen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
