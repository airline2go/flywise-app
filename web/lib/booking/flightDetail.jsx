'use client';

// Ports app.js's flight-detail bottom sheet (openFlightSheet/buildJourney),
// baggage-overview modal (toggleBagInfo) and shareFlight() exactly — same
// #fsheet / #baginfo-ov markup and same .seg-card/.jrny-* classes from
// styles.css. These are single shared surfaces (one sheet, one modal)
// driven by "which offer is currently open", matching the original's
// single-global-element architecture.
import { useEffect } from 'react';
import { offerLegs, fmtDuration, fmtTime, fmtSegDate, dayDiff, fmtPrice } from './offerUtils';
import { apByCode, apLocalizedCityName } from './airportData';
import { AirlineLogo } from './AirlineLogo';
import { showToast } from './toast';

// Multi-city stopover-nights literals — hardcoded 7-language, ported
// verbatim from openFlightSheet()'s inline tL() calls (order: de, en, ar,
// es, fr, it, nl).
const NIGHT = { de: 'Nacht', en: 'night', ar: 'ليلة', es: 'noche', fr: 'nuit', it: 'notte', nl: 'nacht' };
const NIGHTS = { de: 'Nächte', en: 'nights', ar: 'ليالٍ', es: 'noches', fr: 'nuits', it: 'notti', nl: 'nachten' };
const IN_WORD = { de: 'in', en: 'in', ar: 'في', es: 'en', fr: 'à', it: 'a', nl: 'in' };

// apCity()/apFullName() ports: localized city name (falls back to the bare
// code) and the airport's full name (empty when the airport isn't in the
// small bundled AP array — matches the original, which then omits the line).
function apCity(code, lang) {
  const e = apByCode(code);
  return e ? apLocalizedCityName(e, lang) || code : code;
}
function apFullName(code) {
  const e = apByCode(code);
  return e ? e[1] || e[2] || '' : '';
}

// Ports buildJourney() — one itinerary section (a titled list of segment
// cards with layover rows between connecting flights).
function JourneySection({ segs, title, dur, ls, lang }) {
  return (
    <>
      <div className="jrny-sec-t">
        {title}
        {dur ? <span className="jrny-dur">🕐 {fmtDuration(dur)}</span> : null}
      </div>
      {segs.map((s, r) => {
        const code = s.al && s.al[0] ? s.al[0] : 'XX';
        const name = s.al && s.al[1] ? s.al[1] : code;
        const fromFull = apFullName(s.from);
        const toFull = apFullName(s.to);
        const shift = dayDiff(s.dep, s.arr);
        const next = r < segs.length - 1 ? segs[r + 1] : null;
        const layover = next ? Math.round((new Date(next.dep) - new Date(s.arr)) / 6e4) : 0;
        return (
          <div key={r}>
            <div className="seg-card">
              <div className="seg-pt">
                <div className="seg-pt-time">
                  <div className="seg-time">{fmtTime(s.dep)}</div>
                  <div className="seg-date">{fmtSegDate(s.dep, lang)}</div>
                </div>
                <div className="seg-dot-wrap"><div className="seg-dot" /></div>
                <div>
                  <div className="seg-ap">{apCity(s.from, lang)} · {s.from}</div>
                  {fromFull ? <div className="seg-ap-full">{fromFull}</div> : null}
                </div>
              </div>
              <div className="seg-mid">
                <div className="seg-mid-dur">{fmtDuration(s.dur)}</div>
                <div className="seg-mid-line" />
                <div className="seg-mid-al">
                  <span className="seg-al-pill">
                    <AirlineLogo code={code} className="seg-al-logo" as="span" />
                    {name}
                  </span>
                  <span className="seg-al-fn">{ls.det_flight} {String(s.fn)}</span>
                </div>
              </div>
              <div className="seg-pt">
                <div className="seg-pt-time">
                  <div className="seg-time">{fmtTime(s.arr)}{shift > 0 ? <span className="nday">+{shift}</span> : null}</div>
                  <div className="seg-date">{fmtSegDate(s.arr, lang)}</div>
                </div>
                <div className="seg-dot-wrap"><div className="seg-dot end" /></div>
                <div>
                  <div className="seg-ap">{apCity(s.to, lang)} · {s.to}</div>
                  {toFull ? <div className="seg-ap-full">{toFull}</div> : null}
                </div>
              </div>
            </div>
            {next && layover > 0 ? (
              <div className="jrny-layover">⏳ {ls.det_layover} {s.to} · {fmtDuration(layover)}</div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

// Ports openFlightSheet()'s body assembly — outbound section, then either
// per-leg multi-city sections (with stopover-nights indicators) or a return
// section separated by a divider.
function JourneyDetail({ offer, ls, lang }) {
  const legs = offerLegs(offer);
  const isMc = !!(offer.allSlices && offer.allSlices.length > 2);
  const sections = [];

  sections.push(
    <JourneySection
      key="s0"
      segs={legs[0].segs}
      title={`🛫 ${isMc ? `${ls.det_outbound} (1/${legs.length})` : ls.det_outbound}`}
      dur={legs[0].dur}
      ls={ls}
      lang={lang}
    />,
  );

  if (isMc) {
    for (let o = 1; o < legs.length; o++) {
      const nights = Math.round((new Date(legs[o].dep) - new Date(legs[o - 1].arr)) / 864e5);
      sections.push(
        nights > 0 ? (
          <div key={`sep${o}`} className="jrny-stopover-nights">
            🌙 {nights} {nights === 1 ? NIGHT[lang] || NIGHT.de : NIGHTS[lang] || NIGHTS.de} {IN_WORD[lang] || IN_WORD.de} {apCity(legs[o].orig, lang) || legs[o].orig}
          </div>
        ) : (
          <div key={`sep${o}`} className="jrny-sep" />
        ),
      );
      sections.push(
        <JourneySection
          key={`s${o}`}
          segs={legs[o].segs}
          title={`🛫 ${ls.det_outbound} (${o + 1}/${legs.length})`}
          dur={legs[o].dur}
          ls={ls}
          lang={lang}
        />,
      );
    }
  } else if (legs[1] && legs[1].segs) {
    sections.push(<div key="retsep" className="jrny-sep" />);
    sections.push(
      <JourneySection key="ret" segs={legs[1].segs} title={`🛬 ${ls.det_return}`} dur={legs[1].dur} ls={ls} lang={lang} />,
    );
  }

  return <>{sections}</>;
}

// Ports openFlightSheet()/closeFlightSheet() — the #fsheet bottom sheet.
// `offer` is the offer whose details are shown (null = closed). onBook is
// the "book this flight" action (booking flow lands in B3).
export function FlightDetailSheet({ offer, lang, ls, paxCount, onClose, onBook }) {
  const open = !!offer;
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
    return undefined;
  }, [open]);

  return (
    <>
      <div className={`fsheet-ov${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`fsheet${open ? ' open' : ''}`}>
        <div className="fsheet-grip" />
        <div className="fsheet-hd">
          <div className="fsheet-hd-t">{ls.det_title}</div>
          <button type="button" className="fsheet-hd-x" onClick={onClose}>✕</button>
        </div>
        <div className="fsheet-body">
          {offer ? <JourneyDetail offer={offer} ls={ls} lang={lang} /> : null}
        </div>
        <div className="fsheet-foot">
          <div className="fsheet-price">
            <div className="fp-amt">{offer ? fmtPrice(offer.price, lang) : '—'}</div>
            <div className="fp-sub">{paxCount > 1 ? `gesamt (${paxCount} Pax)` : ls.perPerson}</div>
          </div>
          <button type="button" className="fsheet-book" onClick={() => offer && onBook(offer)}>✈ {ls.det_book_now}</button>
        </div>
      </div>
    </>
  );
}

// Ports toggleBagInfo()/closeBagInfo() — the #baginfo-ov overlay (a `.ov`
// that shows when `.open`). Markup/inline-styles copied from index.html's
// #baginfo-ov block so it matches the original pixel-for-pixel.
export function BagInfoModal({ offer, lang, ls, onClose }) {
  const open = !!offer;
  const cabinQty = offer ? (typeof offer.cabinBagQty === 'number' ? offer.cabinBagQty : (offer.hasCabin ? 1 : 0)) : 0;
  const checkedQty = offer ? (typeof offer.checkedBagQty === 'number' ? offer.checkedBagQty : (offer.hasChecked ? 1 : 0)) : 0;
  const cabinKg = offer && typeof offer.cabinBagWeightKg === 'number' ? offer.cabinBagWeightKg : null;
  const checkedKg = offer && typeof offer.checkedBagWeightKg === 'number' ? offer.checkedBagWeightKg : null;

  return (
    <div
      className={`ov${open ? ' open' : ''}`}
      id="baginfo-ov"
      role="dialog"
      aria-modal="true"
      aria-label="Gepäcksübersicht"
      style={{ alignItems: 'flex-end', padding: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 32px', boxShadow: '0 -8px 30px rgba(0,0,0,.15)' }}>
        <div style={{ width: 36, height: 4, background: 'var(--bd2)', borderRadius: 4, margin: '0 auto 16px' }} />
        <div id="baginfo-title" style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: 'var(--tx)', marginBottom: 14 }}>{ls.bg_overview}</div>
        <div id="baginfo-rows">
          <div className="bi-row">
            <span>🎒 {ls.fc_cabin}{cabinKg ? ` · ${cabinKg} kg` : ''}</span>
            <span style={{ color: cabinQty > 0 ? 'var(--gr)' : 'var(--tx3)', fontWeight: 700 }}>{cabinQty > 0 ? `${cabinQty}× ✓` : '0 ✗'}</span>
          </div>
          <div className="bi-row">
            <span>🧳 {ls.fc_checked}{checkedKg ? ` · ${checkedKg} kg` : ''}</span>
            <span style={{ color: checkedQty > 0 ? 'var(--gr)' : 'var(--tx3)', fontWeight: 700 }}>{checkedQty > 0 ? `${checkedQty}× ✓` : '0 ✗'}</span>
          </div>
        </div>
        <button type="button" id="baginfo-close-btn" onClick={onClose} style={{ marginTop: 16, width: '100%', background: 'var(--bg2)', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, color: 'var(--tx)', cursor: 'pointer' }}>{ls.bg_close}</button>
      </div>
    </div>
  );
}

// Ports shareFlight() exactly — Web Share API when available, else copy to
// clipboard with a toast, else a plain info toast. The share text is
// hardcoded German ("ab", "Airpiv:") in the original, reproduced verbatim.
export function shareOffer(offer, lang) {
  if (!offer) return;
  const text = `Airpiv: ${offer.outbound.orig} → ${offer.outbound.dest} ab ${fmtPrice(offer.price, lang)} · ${new Date(offer.outbound.dep).toLocaleDateString('de-DE')} · ${offer.al[1]}`;
  if (navigator.share) {
    navigator.share({ title: 'Airpiv Flug', text, url: window.location.href }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast('🔗 Link kopiert!', 'success');
  } else {
    showToast('📋 ' + text, 'info');
  }
}
