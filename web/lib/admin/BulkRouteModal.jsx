'use client';

import { useEffect, useRef, useState } from 'react';
import { ADMIN_COLORS } from './theme';
import { labelStyle, inputStyle } from './EntityModal';

const REFRESH_OPTIONS = [
  { value: 'none', label: 'SEO فقط (بدون تحديث تلقائي)' },
  { value: '6h', label: 'كل 6 ساعات' },
  { value: '12h', label: 'كل 12 ساعة' },
  { value: '24h', label: 'كل 24 ساعة' },
];

const API_BASE = 'https://api.airpiv.com';

// Multi-airport picker + combination generator — matches admin.js's
// openBulkRouteCreator()/submitBulkRoutes() exactly: pick 2+ airports,
// every possible pair gets created as a draft route (never published
// automatically), any pair that already exists is silently skipped
// server-side.
export default function BulkRouteModal({ onClose, onCreated }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bothDirections, setBothDirections] = useState(true);
  const [refreshFrequency, setRefreshFrequency] = useState('none');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`${API_BASE}/search/airports?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults((data.airports || []).filter((a) => a.type === 'airport'));
      } catch {
        setResults([]);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function addAirport(a) {
    if (selected.some((s) => s.code === a.code)) return;
    setSelected((prev) => [...prev, { code: a.code, city: a.city, country: a.country || null, lat: a.lat, lng: a.lng }]);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function removeAirport(code) {
    setSelected((prev) => prev.filter((a) => a.code !== code));
  }

  const n = selected.length;
  const previewCount = n < 2 ? 0 : bothDirections ? n * (n - 1) : (n * (n - 1)) / 2;

  async function submit() {
    if (selected.length < 2) { setError('اختار مطارين على الأقل'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetch('/admin/api/route-pages/bulk-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airports: selected, bothDirections, refresh_frequency: refreshFrequency }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشلت العملية'); return; }
    onCreated(data);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📦 إنشاء مسارات بالجملة</h2>
        <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, lineHeight: 1.6, margin: '8px 0 14px' }}>
          دوّر وأضف كل المطارات اللي عايز تربطها ببعض — هيتعمل مسار لكل توليفة ممكنة بينهم، وأي مسار موجود فعلاً هيتجاهل تلقائياً. المسارات الجديدة بتتعمل كـ&quot;مسودة&quot; — مش هتظهر للزوار غير لما تنشرها يدوياً.
        </p>

        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>
            أضف مطار
            <input
              type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="ابحث: Berlin, BER..."
              style={inputStyle}
            />
          </label>
          {open && results.length > 0 && (
            <ul style={dropdownStyle}>
              {results.map((a) => {
                const already = selected.some((s) => s.code === a.code);
                return (
                  <li key={a.code}>
                    <button type="button" disabled={already} onMouseDown={() => addAirport(a)} style={{ ...optionStyle, opacity: already ? 0.4 : 1 }}>
                      {a.city} — {a.name} <span style={{ fontFamily: 'monospace' }}>{a.code}</span>{already ? ' ✓ مضاف' : ''}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 16px', minHeight: 20 }}>
          {selected.length === 0 && <span style={{ color: ADMIN_COLORS.tx3, fontSize: 12 }}>لسه ما اخترتش أي مطار</span>}
          {selected.map((a) => (
            <span key={a.code} style={chipStyle}>
              {a.city} ({a.code})
              <button type="button" onClick={() => removeAirport(a.code)} style={chipRemoveStyle}>✕</button>
            </span>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: ADMIN_COLORS.tx2, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={bothDirections} onChange={(e) => setBothDirections(e.target.checked)} style={{ width: 16, height: 16 }} />
          كل الاتجاهين (برلين→لندن ولندن→برلين كمسارين منفصلين)
        </label>

        <label style={labelStyle}>
          معدل تحديث السعر لكل المسارات دي
          <select value={refreshFrequency} onChange={(e) => setRefreshFrequency(e.target.value)} style={inputStyle}>
            {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        {previewCount > 0 && (
          <div style={{ background: ADMIN_COLORS.bg2, borderRadius: 10, padding: '12px 14px', margin: '14px 0 0', fontSize: 13, color: ADMIN_COLORS.tx2 }}>
            📊 {n} مطار مختار → هيتولد لحد {previewCount} مسار (أي مسار موجود فعلاً هيتجاهل تلقائياً)
          </div>
        )}

        {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginTop: 10 }}>{error}</div>}

        <button type="button" disabled={submitting} onClick={submit} style={{ ...submitBtnStyle, marginTop: 16 }}>
          {submitting ? '⏳ جارٍ الإنشاء...' : 'إنشاء كل المسارات'}
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 50,
};
const modalStyle = {
  width: '100%', maxWidth: 560, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const dropdownStyle = {
  position: 'absolute', zIndex: 10, top: '100%', insetInline: 0, marginTop: 2,
  background: ADMIN_COLORS.bg3, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8,
  maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 4,
};
const optionStyle = {
  display: 'block', width: '100%', textAlign: 'right', background: 'none', border: 'none',
  color: ADMIN_COLORS.tx, fontSize: 13, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
};
const chipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: ADMIN_COLORS.tealGlow, color: ADMIN_COLORS.teal2,
  borderRadius: 20, padding: '5px 6px 5px 12px', fontSize: 12, fontWeight: 600,
};
const chipRemoveStyle = {
  background: 'rgba(0,0,0,.15)', border: 'none', borderRadius: '50%', width: 18, height: 18,
  cursor: 'pointer', color: 'inherit', fontSize: 11, lineHeight: 1,
};
const submitBtnStyle = {
  width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
