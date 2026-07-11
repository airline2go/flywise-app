'use client';

// Ports app.js's origin/destination autocomplete fields (acS()/pickAC()/
// handleFromInput() etc.): 300ms-debounced GET /search/airports, up to
// 8 results, city entries carry a "City" badge distinct from airports.
// [SEARCH-INTEGRITY-FIX] Typing over a previously-picked value must
// invalidate it — ported from app.js's acTypeReset(), otherwise a user
// could edit the text after picking an airport and submit a stale
// origin/destination that no longer matches what's displayed.
import { useEffect, useRef, useState } from 'react';
import { searchAirports } from '../booking-api';

export default function AirportField({ label, placeholder, value, onSelect, t }) {
  const [query, setQuery] = useState(value ? `${value.city} (${value.iata})` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  // [SET-STATE-IN-EFFECT] setQuery() runs inside this callback boundary,
  // not synchronously in the effect body — same pattern used throughout
  // this codebase (e.g. AirportAutocomplete.jsx) to satisfy the
  // set-state-in-effect lint rule.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(value ? `${value.city} (${value.iata})` : ''); }, 0);
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
    // Any keystroke invalidates a previously-picked value until a new
    // suggestion is chosen — matches acTypeReset()'s intent.
    if (value) onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      const { ok, data } = await searchAirports(next.trim());
      setLoading(false);
      setResults(ok ? (data.airports || []) : []);
    }, 300);
  }

  function pick(a) {
    onSelect({ iata: a.code, city: a.city, name: a.name, country: a.country, lat: a.lat, lng: a.lng });
    setQuery(`${a.city} (${a.code})`);
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
      {open && (
        <div style={dropdownStyle}>
          {loading && <div style={emptyRowStyle}>…</div>}
          {!loading && results.length === 0 && <div style={emptyRowStyle}>{t.searchNoAirportResults}</div>}
          {!loading && results.map((a) => (
            <button key={a.code} type="button" onMouseDown={() => pick(a)} style={optionStyle}>
              <span>{a.city} — {a.name}</span>
              <span style={codeStyle}>{a.code}{a.type === 'city' ? ` · ${t.searchCityBadge}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--tx2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };
const inputStyle = {
  width: '100%', padding: '11px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)',
  background: 'var(--bg)', color: 'var(--tx)', fontSize: 15,
};
const dropdownStyle = {
  position: 'absolute', zIndex: 20, top: '100%', insetInline: 0, marginTop: 4,
  background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)',
  maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
};
const optionStyle = {
  display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'right',
  background: 'none', border: 'none', borderBottom: '1px solid var(--bd)', color: 'var(--tx)',
  fontSize: 13.5, padding: '10px 12px', cursor: 'pointer',
};
const codeStyle = { fontFamily: 'monospace', color: 'var(--tx3)', fontSize: 12, whiteSpace: 'nowrap' };
const emptyRowStyle = { padding: '12px', color: 'var(--tx3)', fontSize: 13, textAlign: 'center' };
