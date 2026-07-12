'use client';

// Ports app.js's #rp-edit-drop inline "edit search" dropdown (toggleRpEdit /
// rpEditLoc / rpAcS / rpPickAC / doRpSearch, plus the multi-city variant).
// Tapping the results-page title opens this; you can tweak trip type,
// origin/destination, dates and travellers, then re-run the search without
// going back to the homepage. Same .rp-edit-* / .acdrop markup as the
// original, and — like the original — its origin/destination autocomplete
// filters only the small bundled AP array (local, no network) and shows the
// German city/country names (this dropdown was never localized).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchProvider';
import { AP } from './airportData';
import { saveRecentSearch, saveRecentSearchMC } from './recentSearches';
import DatePicker from './DatePicker';
import PaxPicker from './PaxPicker';

function fmtDate(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

// Ports rpAcS()'s local AP filter: IATA-prefix / name / city_de / country_de
// match, capped at 8 results.
function acFilter(query) {
  const q = query.toLowerCase();
  const out = [];
  for (const e of AP) {
    if (e[0].toLowerCase().indexOf(q) === 0 || e[1].toLowerCase().indexOf(q) >= 0 || e[2].toLowerCase().indexOf(q) >= 0 || e[3].toLowerCase().indexOf(q) >= 0) {
      out.push(e);
      if (out.length >= 8) break;
    }
  }
  return out;
}

const acInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit', color: 'inherit' };

// One inline-editable origin/destination field (rpEditLoc + rpAcS + rpPickAC).
function RpLocField({ label, display, onPick }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const results = editing && query ? acFilter(query) : [];

  function start() {
    setQuery(display && display !== '—' ? display : '');
    setEditing(true);
  }
  function pick(e) {
    onPick({ iata: e[0], city: e[2], name: e[1], country: e[3] });
    setEditing(false);
    setQuery('');
  }

  return (
    <div className="rp-edit-field" style={{ position: 'relative' }} onClick={editing ? undefined : start}>
      <div className="rp-edit-lbl">{label}</div>
      {editing ? (
        <input
          className="rp-edit-val" autoFocus autoComplete="off" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={acInputStyle}
        />
      ) : (
        <div className="rp-edit-val">{display || '—'}</div>
      )}
      <div className={`acdrop${results.length ? ' open' : ''}`} role="listbox" aria-label="Flughäfen" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
        {results.map((e) => (
          <div key={e[0]} className="aci" role="option" aria-selected="false" onClick={(ev) => { ev.stopPropagation(); pick(e); }}>
            <div className="acb">{e[0]}</div>
            <div><div className="acn">{e[2]}, {e[3]}</div><div className="acs">{e[1]}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RpEditDrop({ open, lang, trip, origin, destination, departDate, returnDate, onClose }) {
  const router = useRouter();
  const search = useSearch();
  const isMc = trip === 'mc';

  // ── standard (one-way / round-trip) edit state ──
  const [editTrip, setEditTrip] = useState(trip === 'rr' ? 'rr' : 'ow');
  const [from, setFrom] = useState(() => search.origin || (origin ? { iata: origin, city: origin, name: origin, country: '' } : null));
  const [to, setTo] = useState(() => search.destination || (destination ? { iata: destination, city: destination, name: destination, country: '' } : null));
  const [dep, setDep] = useState(departDate || null);
  const [ret, setRet] = useState(returnDate || null);
  const [dateOpen, setDateOpen] = useState(false);

  // ── multi-city edit state (a working copy of the legs) ──
  const [mcLegs, setMcLegs] = useState(() => (search.mcLegs || []).map((l) => ({ ...l })));
  const [mcDateOpen, setMcDateOpen] = useState(null);

  const [paxOpen, setPaxOpen] = useState(false);
  const paxCount = search.pax.adults + search.pax.children + search.pax.infants;
  const paxLabel = `${paxCount} Reisende · ${search.pax.cabin || 'economy'}`;

  function resultsPath(pair) {
    const prefix = lang === 'de' ? '' : `/${lang}`;
    return `${prefix}/search/${pair}`;
  }

  // Ports doRpSearch() for the standard case: commit the edits into search
  // state, persist the recent search, and navigate to the new results URL.
  function doStdSearch() {
    if (!from || !to || !dep) return;
    search.setOrigin(from);
    search.setDestination(to);
    search.setTrip(editTrip);
    search.setDates(dep, editTrip === 'rr' ? ret : null);
    saveRecentSearch({ orig: from.iata, dest: to.iata, dep, ret: editTrip === 'rr' ? (ret || '') : '', origC: from.city, destC: to.city });
    const params = new URLSearchParams({ trip: editTrip, depart: dep });
    if (editTrip === 'rr' && ret) params.set('return', ret);
    onClose();
    router.push(`${resultsPath(`${from.iata}-${to.iata}`)}?${params.toString()}`);
  }

  // Multi-city re-search: commit the edited legs into search state (this
  // re-runs the search via useFlightSearch's payload dependency) and close.
  function doMcSearch() {
    if (mcLegs.some((l) => !l.origin || !l.destination || !l.date)) return;
    search.setMcLegs(mcLegs);
    saveRecentSearchMC(mcLegs.map((l) => ({ orig: l.origin.iata, dest: l.destination.iata, dep: l.date, origC: l.origin.city, destC: l.destination.city })));
    onClose();
  }

  function setLeg(i, patch) {
    setMcLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <div className={`rp-edit-drop${open ? ' open' : ''}`} id="rp-edit-drop">
      {isMc ? (
        <>
          <div style={{ padding: '4px 0 8px' }}>
            {mcLegs.map((leg, n) => (
              <div key={n} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
                  Flug {n + 1} ({n === 0 ? 'Hinflug' : n === mcLegs.length - 1 ? 'Letzter Stopp' : `Zwischenstopp ${n}`})
                </div>
                <div className="rp-edit-row">
                  <RpLocField label="Von" display={leg.origin ? leg.origin.city : '—'} onPick={(a) => setLeg(n, { origin: a })} />
                  <RpLocField label="Nach" display={leg.destination ? leg.destination.city : '—'} onPick={(a) => setLeg(n, { destination: a })} />
                </div>
                <div className="rp-edit-row" style={{ gridTemplateColumns: '1fr', marginTop: 5 }}>
                  <div className="rp-edit-field" onClick={() => setMcDateOpen(n)}>
                    <div className="rp-edit-lbl">Datum</div>
                    <div className="rp-edit-val">{leg.date ? fmtDate(leg.date) : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="rp-edit-search" onClick={doMcSearch}>🔍 Erneut suchen</button>
          {mcDateOpen !== null && (
            <DatePicker
              mode="single"
              value={mcLegs[mcDateOpen].date}
              minDate={mcDateOpen > 0 ? mcLegs[mcDateOpen - 1].date : undefined}
              onChange={(v) => setLeg(mcDateOpen, { date: v })}
              onClose={() => setMcDateOpen(null)}
            />
          )}
        </>
      ) : (
        <>
          <div className="rp-edit-row" style={{ gridTemplateColumns: '1fr', marginBottom: 8 }}>
            <div className="ksel-wrap">
              <select className="ksel" value={editTrip} onChange={(e) => setEditTrip(e.target.value)}>
                <option value="rr">⇄ Hin- und Rückreise</option>
                <option value="ow">→ Einfache Fahrt</option>
              </select>
              <svg className="ksel-arr" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>
          <div className="rp-edit-row">
            <RpLocField label="Von" display={from ? from.city : '—'} onPick={setFrom} />
            <RpLocField label="Nach" display={to ? to.city : '—'} onPick={setTo} />
          </div>
          <div className="rp-edit-row">
            <div className="rp-edit-field" onClick={() => setDateOpen(true)}>
              <div className="rp-edit-lbl">Abflug</div>
              <div className="rp-edit-val">{fmtDate(dep)}</div>
            </div>
            {editTrip !== 'ow' && (
              <div className="rp-edit-field" onClick={() => setDateOpen(true)}>
                <div className="rp-edit-lbl">Rückkehr</div>
                <div className="rp-edit-val">{fmtDate(ret)}</div>
              </div>
            )}
          </div>
          <div className="rp-edit-row" style={{ gridTemplateColumns: '1fr' }}>
            <div className="rp-edit-field" onClick={() => setPaxOpen(true)}>
              <div className="rp-edit-lbl">Reisende</div>
              <div className="rp-edit-val">{paxLabel}</div>
            </div>
          </div>
          <button type="button" className="rp-edit-search" onClick={doStdSearch}>🔍 Erneut suchen</button>
          {dateOpen && (
            <DatePicker
              mode={editTrip === 'rr' ? 'range' : 'single'}
              value={editTrip === 'rr' ? { depart: dep, return: ret } : dep}
              onChange={(v) => { if (editTrip === 'rr') { setDep(v.depart); setRet(v.return); } else { setDep(v); } }}
              onClose={() => setDateOpen(false)}
            />
          )}
        </>
      )}

      {paxOpen && <PaxPicker pax={search.pax} onChange={search.setPax} onClose={() => setPaxOpen(false)} />}
    </div>
  );
}
