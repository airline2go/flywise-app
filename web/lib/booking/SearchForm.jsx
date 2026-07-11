'use client';

// Ports app.js's home search card: trip-type select (one-way/round-trip/
// multi-city), origin/destination fields with swap, the custom calendar,
// the passenger/cabin popover, and doSearch()'s pre-submit validation
// (missing field / same-airport checks — shown as a compact inline
// banner here instead of the old #help-ov overlay, same checks, lighter
// UI). Submission is a client-side route push to the canonical
// `/search/{ORIGIN}-{DEST}?trip=&depart=&return=` deep-link shape (or
// `/search/multi-city` for the mc trip type, which has no single
// origin-destination pair to encode) — the actual search request itself
// runs on the results page, not here.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AirportField from './AirportField';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';
import { useSearch } from './SearchProvider';

function fmtDisplayDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyLeg() {
  return { origin: null, destination: null, date: null };
}

export default function SearchForm({ lang, t }) {
  const router = useRouter();
  const search = useSearch();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const [mcLegDateOpen, setMcLegDateOpen] = useState(null); // leg index or null
  const [error, setError] = useState('');

  const legs = search.mcLegs.length ? search.mcLegs : [emptyLeg(), emptyLeg()];

  function setLeg(index, patch) {
    const next = legs.slice();
    next[index] = { ...next[index], ...patch };
    search.setMcLegs(next);
  }

  function addLeg() {
    search.setMcLegs([...legs, emptyLeg()]);
  }

  function removeLeg(index) {
    search.setMcLegs(legs.filter((_, i) => i !== index));
  }

  function resultsPath(pair) {
    const prefix = lang === 'de' ? '' : `/${lang}`;
    return `${prefix}/search/${pair}`;
  }

  function submit() {
    setError('');
    if (search.trip === 'mc') {
      const invalid = legs.some((l) => !l.origin || !l.destination || !l.date);
      if (invalid) { setError(t.searchValidationDateRequired); return; }
      router.push(resultsPath('multi-city'));
      return;
    }
    if (!search.origin) { setError(t.searchValidationOriginRequired); return; }
    if (!search.destination) { setError(t.searchValidationDestinationRequired); return; }
    if (search.origin.iata === search.destination.iata) { setError(t.searchValidationSameAirport); return; }
    if (!search.departureDate) { setError(t.searchValidationDateRequired); return; }
    const params = new URLSearchParams({ trip: search.trip, depart: search.departureDate });
    if (search.trip === 'rr' && search.returnDate) params.set('return', search.returnDate);
    router.push(`${resultsPath(`${search.origin.iata}-${search.destination.iata}`)}?${params.toString()}`);
  }

  const paxCount = search.pax.adults + search.pax.children + search.pax.infants;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select
          value={search.trip}
          onChange={(e) => search.setTrip(e.target.value)}
          style={tripSelectStyle}
        >
          <option value="rr">{t.tripRoundTrip}</option>
          <option value="ow">{t.tripOneWay}</option>
          <option value="mc">{t.tripMultiCity}</option>
        </select>
      </div>

      {search.trip !== 'mc' ? (
        <>
          <div style={fieldRowStyle}>
            <AirportField label={t.searchOriginLabel} placeholder={t.searchOriginPlaceholder} value={search.origin} onSelect={search.setOrigin} t={t} />
            <button type="button" onClick={search.swapOriginDestination} style={swapBtnStyle} aria-label={t.searchSwapAria}>⇄</button>
            <AirportField label={t.searchDestinationLabel} placeholder={t.searchDestinationPlaceholder} value={search.destination} onSelect={search.setDestination} t={t} />
          </div>

          <div style={fieldRowStyle}>
            <button type="button" onClick={() => setDatePickerOpen(true)} style={dateFieldStyle}>
              <span style={labelStyle}>{t.searchDepartDateLabel}</span>
              <span>{fmtDisplayDate(search.departureDate) || t.searchDatePlaceholder}</span>
            </button>
            {search.trip === 'rr' && (
              <button type="button" onClick={() => setDatePickerOpen(true)} style={dateFieldStyle}>
                <span style={labelStyle}>{t.searchReturnDateLabel}</span>
                <span>{fmtDisplayDate(search.returnDate) || t.searchDatePlaceholder}</span>
              </button>
            )}
            <button type="button" onClick={() => setPaxOpen(true)} style={paxFieldStyle}>
              <span style={labelStyle}>{t.paxCabinClass}</span>
              <span>{t.paxSummaryTemplate.replace('{count}', paxCount)}</span>
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {legs.map((leg, i) => (
            <div key={i} style={fieldRowStyle}>
              <AirportField label={`${t.searchLegLabel.replace('{n}', i + 1)} · ${t.searchOriginLabel}`} placeholder={t.searchOriginPlaceholder} value={leg.origin} onSelect={(a) => setLeg(i, { origin: a })} t={t} />
              <AirportField label={t.searchDestinationLabel} placeholder={t.searchDestinationPlaceholder} value={leg.destination} onSelect={(a) => setLeg(i, { destination: a })} t={t} />
              <button type="button" onClick={() => setMcLegDateOpen(i)} style={dateFieldStyle}>
                <span style={labelStyle}>{t.searchDepartDateLabel}</span>
                <span>{fmtDisplayDate(leg.date) || t.searchDatePlaceholder}</span>
              </button>
              {legs.length > 2 && (
                <button type="button" onClick={() => removeLeg(i)} style={removeLegBtnStyle}>{t.searchRemoveLeg}</button>
              )}
            </div>
          ))}
          {legs.length < 6 && (
            <button type="button" onClick={addLeg} style={addLegBtnStyle}>{t.searchAddLeg}</button>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setPaxOpen(true)} style={{ ...paxFieldStyle, maxWidth: 220 }}>
              <span style={labelStyle}>{t.paxCabinClass}</span>
              <span>{t.paxSummaryTemplate.replace('{count}', paxCount)}</span>
            </button>
          </div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <button type="button" onClick={submit} style={submitBtnStyle}>{t.searchSubmitButton}</button>

      {datePickerOpen && (
        <DatePicker
          mode="range"
          value={{ depart: search.departureDate, return: search.trip === 'rr' ? search.returnDate : null }}
          doneLabel={t.paxDoneButton}
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
        <PaxPicker pax={search.pax} onChange={search.setPax} onClose={() => setPaxOpen(false)} t={t} />
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
  padding: 20, boxShadow: '0 8px 28px rgba(16,29,44,.08)', maxWidth: 760, margin: '0 auto',
};
const tripSelectStyle = {
  padding: '9px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)',
  background: 'var(--bg2)', color: 'var(--tx)', fontSize: 13.5, fontWeight: 600,
};
const fieldRowStyle = { display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10, flexWrap: 'wrap' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--tx2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };
const dateFieldStyle = {
  flex: 1, minWidth: 130, textAlign: 'right', padding: '11px 12px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 14, cursor: 'pointer',
  display: 'flex', flexDirection: 'column', gap: 2,
};
const paxFieldStyle = { ...dateFieldStyle, flex: 1 };
const swapBtnStyle = {
  width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--bd)', background: 'var(--bg)',
  color: 'var(--teal)', fontSize: 16, cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 1,
};
const addLegBtnStyle = {
  padding: '9px 14px', borderRadius: 'var(--r-sm)', border: '1px dashed var(--bd2)', background: 'transparent',
  color: 'var(--teal2)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
};
const removeLegBtnStyle = {
  padding: '9px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)', background: 'transparent',
  color: 'var(--rd)', fontSize: 12, cursor: 'pointer',
};
const errorStyle = { color: 'var(--rd)', fontSize: 13, marginBottom: 10 };
const submitBtnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--teal)',
  color: '#fff', fontWeight: 700, fontSize: 15.5, cursor: 'pointer',
};
