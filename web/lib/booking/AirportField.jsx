'use client';

// Ports app.js's acS()/pickAC()/clearField() and the real .kfield/.acdrop/
// .aci markup exactly (see SearchForm.jsx's header comment on why this
// matters). 300ms-debounced GET /search/airports, up to 8 results, a
// "City"/"Stadt" badge on city-type results — including the original's
// own quirk of only translating that badge for ar/en and leaving every
// other language (de/es/fr/it/nl) as German "Stadt"/"Alle Flughäfen"
// (see acS()'s inline ternary — not a bug I'm fixing, a faithful port).
import { useEffect, useRef, useState } from 'react';
import { searchAirports } from '../booking-api';

const ICONS = {
  from: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 6H5L3 8l4 2-2 4 2 1 3-3 4 2 2-2-2-5 4-2-2-2h-3z" /></svg>,
  to: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
};

function cityBadgeLabel(lang) {
  if (lang === 'ar') return 'مدينة';
  if (lang === 'en') return 'City';
  return 'Stadt';
}
function allAirportsLabel(lang) {
  if (lang === 'ar') return 'كل المطارات';
  if (lang === 'en') return 'All airports';
  return 'Alle Flughäfen';
}

export default function AirportField({ side, ls, value, onSelect, compact }) {
  const isFrom = side === 'from' || side === 'mc-from';
  const [query, setQuery] = useState(value ? value.city : (side === 'from' ? 'Berlin' : ''));
  const [sub, setSub] = useState(value ? `${value.name} · ${value.iata}` : (side === 'from' ? 'Berlin Brandenburg · BER' : (compact ? '' : 'Wohin soll es gehen?')));
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const lang = 'de';

  useEffect(() => {
    const t = setTimeout(() => {
      if (value) { setQuery(value.city); setSub(`${value.name} · ${value.iata}`); }
    }, 0);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleChange(e) {
    const next = e.target.value;
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) { setOpen(false); return; }
    setResults([]);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      const { ok, data } = await searchAirports(next.trim());
      if (!ok || !data.airports || !data.airports.length) { setResults([]); return; }
      setResults(data.airports.slice(0, 8));
    }, 300);
  }

  function pick(a) {
    const isCity = a.type === 'city';
    const name = isCity ? a.city : (a.name || a.city);
    onSelect({ iata: a.code, city: a.city, name, country: a.country, lat: a.lat, lng: a.lng });
    setQuery(a.city);
    setSub(`${name} · ${a.code}`);
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    if (side === 'from') { setQuery('Berlin'); setSub('Berlin Brandenburg · BER'); }
    else { setQuery(''); setSub('Wohin soll es gehen?'); }
  }

  if (compact) {
    return (
      <div ref={wrapRef} style={compactWrapStyle}>
        <div style={compactLabelStyle}>{isFrom ? 'Von' : 'Nach'}</div>
        <input
          value={query} onChange={handleChange} onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Stadt oder Flughafen" autoComplete="off" style={compactInputStyle}
        />
        {open && (
          <div style={compactDropStyle}>
            {results.map((a) => (
              <button key={a.code} type="button" onMouseDown={() => pick(a)} style={compactOptionStyle}>
                {a.city} — {a.name} <span style={{ fontFamily: 'monospace' }}>{a.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="kfield" style={{ position: 'relative' }}>
      <div className="kfield-ico">{ICONS[isFrom ? 'from' : 'to']}</div>
      <div className="kfield-in">
        <input
          type="search" className="kinput"
          placeholder={isFrom ? ls.from_placeholder : ls.to_placeholder}
          autoComplete="off" value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
        />
        <div className="kfield-sub">{sub}</div>
      </div>
      {isFrom && <button type="button" className="kclear" onClick={clear}>✕</button>}
      {open && (
        <div className="acdrop open" role="listbox" aria-label={isFrom ? 'Abflughäfen' : 'Zielflughäfen'}>
          {results.map((a) => {
            const isCity = a.type === 'city';
            const name = isCity ? a.city : (a.name || a.city);
            const sub2 = isCity ? `${a.country ? a.country + ' · ' : ''}${allAirportsLabel(lang)}` : `${a.city}${a.country ? ' · ' + a.country : ''}`;
            return (
              <div key={a.code} className="aci" role="option" aria-selected="false" onMouseDown={() => pick(a)}>
                <div className="acb" style={isCity ? { background: 'var(--teal-lt)', color: 'var(--teal2)' } : undefined}>{a.code}</div>
                <div>
                  <div className="acn">
                    {name}
                    {isCity && <span style={cityBadgeStyle}>{cityBadgeLabel(lang)}</span>}
                  </div>
                  <div className="acs">{sub2}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cityBadgeStyle = {
  marginInlineStart: 8, fontSize: 9, fontWeight: 800, color: 'var(--teal2)',
  background: 'var(--teal-lt)', borderRadius: 5, padding: '1px 6px', verticalAlign: 'middle',
};
const compactWrapStyle = {
  flex: 1, position: 'relative', background: 'var(--bg)', border: '1.5px solid var(--bd)',
  borderRadius: 10, padding: '10px 12px',
};
const compactLabelStyle = { fontSize: 10, color: 'var(--tx3)', marginBottom: 2 };
const compactInputStyle = { border: 'none', background: 'transparent', width: '100%', fontSize: 14, fontWeight: 700, color: 'var(--tx)', outline: 'none' };
const compactDropStyle = {
  position: 'absolute', top: 'calc(100% + 4px)', insetInline: 0, background: 'var(--bg)',
  border: '1.5px solid var(--bd)', borderRadius: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.15)', maxHeight: 220, overflowY: 'auto',
};
const compactOptionStyle = { display: 'block', width: '100%', textAlign: 'right', background: 'none', border: 'none', color: 'var(--tx)', fontSize: 13, padding: '8px 10px', cursor: 'pointer' };
