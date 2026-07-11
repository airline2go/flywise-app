'use client';

// Ported directly from the real index.html/app.js homepage search card —
// same CSS classes (styles.css), same structural markup, same copy
// (see legacyStrings.js, extracted verbatim from app.js's own
// TRANSLATIONS dict). Not a redesign: this file exists so the visible
// result matches the original pixel-for-pixel, not just functionally.
//
// [NOT-PORTED] The homepage's own inline .loader/.ebox (search always
// transitions to the full-screen results route in this app, so those never
// actually show — see the ResultsClient loading/error states instead). The
// #recent-searches chips are handled by <RecentSearches> in HomeHero; this
// form persists each search to localStorage on submit (saveRecentSearch).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AirportField from './AirportField';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';
import { useSearch } from './SearchProvider';
import { saveRecentSearch, saveRecentSearchMC } from './recentSearches';

function fmtDisplayDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyLeg() {
  return { origin: null, destination: null, date: null };
}

const MC_LEG_LABELS_DE = ['(Hinflug)', '(Zwischenstopp)', '(letzter Stopp)'];

export default function SearchForm({ lang, ls }) {
  const router = useRouter();
  const search = useSearch();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const [mcLegDateOpen, setMcLegDateOpen] = useState(null);
  const [error, setError] = useState('');

  const legs = search.mcLegs.length ? search.mcLegs : [emptyLeg(), emptyLeg()];

  function setLeg(index, patch) {
    const next = legs.slice();
    next[index] = { ...next[index], ...patch };
    search.setMcLegs(next);
  }
  function addLeg() { search.setMcLegs([...legs, emptyLeg()]); }
  function removeLeg(index) { search.setMcLegs(legs.filter((_, i) => i !== index)); }

  function resultsPath(pair) {
    const prefix = lang === 'de' ? '' : `/${lang}`;
    return `${prefix}/search/${pair}`;
  }

  function submit() {
    setError('');
    if (search.trip === 'mc') {
      if (legs.some((l) => !l.origin || !l.destination || !l.date)) { setError('Bitte alle Felder ausfüllen'); return; }
      saveRecentSearchMC(legs.map((l) => ({ orig: l.origin.iata, dest: l.destination.iata, dep: l.date, origC: l.origin.city, destC: l.destination.city })));
      router.push(resultsPath('multi-city'));
      return;
    }
    if (!search.origin) { setError('Bitte wähle einen Abflughafen'); return; }
    if (!search.destination) { setError('Bitte wähle einen Zielflughafen'); return; }
    if (search.origin.iata === search.destination.iata) { setError('Start und Ziel dürfen nicht gleich sein'); return; }
    if (!search.departureDate) { setError('Bitte wähle ein Reisedatum'); return; }
    saveRecentSearch({
      orig: search.origin.iata, dest: search.destination.iata,
      dep: search.departureDate, ret: search.trip === 'rr' ? search.returnDate : '',
      origC: search.origin.city, destC: search.destination.city,
    });
    const params = new URLSearchParams({ trip: search.trip, depart: search.departureDate });
    if (search.trip === 'rr' && search.returnDate) params.set('return', search.returnDate);
    router.push(`${resultsPath(`${search.origin.iata}-${search.destination.iata}`)}?${params.toString()}`);
  }

  const paxLabel = `${search.pax.adults + search.pax.children + search.pax.infants} Erw. · ${search.pax.cabin === 'economy' ? 'Economy' : search.pax.cabin === 'premium_economy' ? 'Premium Economy' : search.pax.cabin === 'business' ? 'Business' : 'First Class'}`;

  return (
    <div className="scard">
      <div className="krow">
        <div className="ksel-wrap">
          <select className="ksel" value={search.trip} onChange={(e) => search.setTrip(e.target.value)}>
            <option value="rr">{ls.trip_rr}</option>
            <option value="ow">{ls.trip_ow}</option>
            <option value="mc">+ Mehrere Städte</option>
          </select>
          <svg className="ksel-arr" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
        </div>
        <button type="button" className="kpax-btn" onClick={() => setPaxOpen(true)}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          <span>{search.pax.adults + search.pax.children + search.pax.infants}</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginInlineStart: 5 }}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
          <span>{search.pax.checkedBags}</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginInlineStart: 3 }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {search.trip !== 'mc' ? (
        <>
          <AirportField
            side="from" ls={ls}
            value={search.origin}
            onSelect={search.setOrigin}
          />

          <div className="kswap-row">
            <div className="kline" />
            <button type="button" className="kswap" onClick={search.swapOriginDestination} aria-label="Abflug- und Zielort tauschen">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
            </button>
            <div className="kline" />
          </div>

          <AirportField
            side="to" ls={ls}
            value={search.destination}
            onSelect={search.setDestination}
          />

          <div className="kfield kdates-field">
            <div className="kfield-in kdates-in">
              <button type="button" className="kdate-half" onClick={() => setDatePickerOpen(true)}>
                <div className="kdate-lbl">{ls.depart_lbl}</div>
                <div className="kdate-val">{fmtDisplayDate(search.departureDate) || ls.date_pick}</div>
              </button>
              {search.trip === 'rr' && (
                <>
                  <div className="kdates-sep" />
                  <button type="button" className="kdate-half" onClick={() => setDatePickerOpen(true)}>
                    <div className="kdate-lbl">{ls.return_lbl}</div>
                    <div className="kdate-val">{fmtDisplayDate(search.returnDate) || ls.date_pick}</div>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div>
          {legs.map((leg, i) => (
            <div key={i} className="mc-leg" style={mcLegBoxStyle}>
              <div style={mcLegTitleStyle}>
                Flug {i + 1} {MC_LEG_LABELS_DE[i === 0 ? 0 : i === legs.length - 1 ? 2 : 1]}
                {legs.length > 2 && (
                  <button type="button" onClick={() => removeLeg(i)} style={mcRemoveBtnStyle}>✕ entfernen</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <AirportField side="mc-from" ls={ls} value={leg.origin} onSelect={(a) => setLeg(i, { origin: a })} compact />
                <AirportField side="mc-to" ls={ls} value={leg.destination} onSelect={(a) => setLeg(i, { destination: a })} compact />
              </div>
              <button type="button" onClick={() => setMcLegDateOpen(i)} style={mcDateBtnStyle}>
                <div style={{ flex: 1 }}>
                  <div style={mcDateLblStyle}>Datum</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: leg.date ? 'var(--tx)' : 'var(--tx3)' }}>{fmtDisplayDate(leg.date) || ls.date_pick}</div>
                </div>
              </button>
            </div>
          ))}
          {legs.length < 6 && (
            <button type="button" id="mc-add-btn" onClick={addLeg} style={{ display: 'block', width: '100%', background: 'transparent', border: '2px dashed var(--teal)', borderRadius: 12, padding: 12, color: 'var(--teal)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              + Weiteren Stopp hinzufügen
            </button>
          )}
        </div>
      )}

      <button type="button" className="gobtn" onClick={submit}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <span>{ls.search_btn}</span>
      </button>

      {error && <div style={{ color: 'var(--rd)', fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>{error}</div>}

      <div className="kextras">
        <button type="button" className="xch">{ls.direct_chip}</button>
        <button type="button" className="xch">{ls.baggage_chip}</button>
        <span className="xtax">{ls.tax_note}</span>
      </div>

      {datePickerOpen && (
        <DatePicker
          mode="range"
          value={{ depart: search.departureDate, return: search.trip === 'rr' ? search.returnDate : null }}
          onChange={(v) => search.setDates(v.depart, v.return)}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
      {mcLegDateOpen !== null && (
        <DatePicker
          mode="single"
          value={legs[mcLegDateOpen].date}
          minDate={mcLegDateOpen > 0 ? legs[mcLegDateOpen - 1].date : addDays(0)}
          onChange={(v) => setLeg(mcLegDateOpen, { date: v })}
          onClose={() => setMcLegDateOpen(null)}
        />
      )}
      {paxOpen && (
        <PaxPicker pax={search.pax} onChange={search.setPax} onClose={() => setPaxOpen(false)} />
      )}
      {/* paxLabel computed for parity with the old #pax-lbl hidden field; not otherwise rendered here */}
      <span style={{ display: 'none' }}>{paxLabel}</span>
    </div>
  );
}

const mcLegBoxStyle = { background: 'var(--bg2)', border: '1.5px solid var(--bd)', borderRadius: 14, padding: 12, marginBottom: 8, position: 'relative' };
const mcLegTitleStyle = { fontSize: 11, fontWeight: 700, color: 'var(--teal)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', justifyContent: 'space-between' };
const mcRemoveBtnStyle = { background: 'none', border: 'none', color: 'var(--rd)', fontSize: 11, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 };
const mcDateBtnStyle = { width: '100%', textAlign: 'right', background: 'var(--bg)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 };
const mcDateLblStyle = { fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 };
