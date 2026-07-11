'use client';

import { useEffect, useRef, useState } from 'react';
import { ADMIN_COLORS } from './theme';
import { labelStyle, inputStyle } from './EntityModal';

// Live airport/city search, matching the old admin.js's route-page
// editor — calls flywise-server's public GET /search/airports directly
// from the browser (no admin auth needed for this endpoint, so no
// Route Handler proxy hop). On picking a real airport result, reports
// {code, city, country, lat, lng} back to the caller; a "city" result
// is skipped (route pages need real airport coordinates — see
// [ROUTE-PAGES] in search.routes.js for why cities carry no lat/lng).
const API_BASE = 'https://api.airpiv.com';

export default function AirportAutocomplete({ label, initialText, onSelect }) {
  const [query, setQuery] = useState(initialText || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // [SET-STATE-IN-EFFECT] Every setResults() call below happens inside
    // this setTimeout callback (including the short-query early-out), not
    // synchronously in the effect body — that's what the "callback
    // function when external state changes" pattern React's linter wants.
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`${API_BASE}/search/airports?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults((data.airports || []).filter((a) => a.type === 'airport'));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function pick(airport) {
    setQuery(`${airport.city} (${airport.code})`);
    setOpen(false);
    setResults([]);
    onSelect(airport);
  }

  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>
        {label}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="ابحث بالمدينة أو كود المطار..."
          style={inputStyle}
        />
      </label>
      {open && results.length > 0 && (
        <ul style={dropdownStyle}>
          {results.map((a) => (
            <li key={a.code}>
              <button type="button" onMouseDown={() => pick(a)} style={optionStyle}>
                {a.city} ({a.code}) — {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const dropdownStyle = {
  position: 'absolute', zIndex: 10, top: '100%', insetInline: 0, marginTop: 2,
  background: ADMIN_COLORS.bg3, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8,
  maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 4,
};
const optionStyle = {
  display: 'block', width: '100%', textAlign: 'right', background: 'none', border: 'none',
  color: ADMIN_COLORS.tx, fontSize: 13, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
};
