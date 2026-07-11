'use client';

// Ports admin.js's missing-routes matrix (openRouteMatrix/matrixAirportSearch/
// loadRouteMatrix/matrixQuickCreate): pick 2-40 airports, see an N×N grid of
// which pairs already exist (published/draft) vs are missing, click a missing
// cell to jump straight into the route-create form with both airports
// prefilled.
import { useEffect, useRef, useState } from 'react';
import { ADMIN_COLORS } from './theme';
import { labelStyle, inputStyle } from './EntityModal';

const API_BASE = 'https://api.airpiv.com';
const MAX_AIRPORTS = 40;

export default function RouteMatrixModal({ onClose, onQuickCreate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState('picker'); // 'picker' | 'grid'
  const [existingMap, setExistingMap] = useState({});
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
    if (selected.length >= MAX_AIRPORTS) { setError(`الحد الأقصى ${MAX_AIRPORTS} مطار للمصفوفة الواحدة`); return; }
    if (selected.some((s) => s.code === a.code)) return;
    setSelected((prev) => [...prev, { code: a.code, city: a.city, country: a.country || null, lat: a.lat, lng: a.lng }]);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function removeAirport(code) {
    setSelected((prev) => prev.filter((a) => a.code !== code));
  }

  async function loadMatrix() {
    if (selected.length < 2) { setError('اختار مطارين على الأقل'); return; }
    setError('');
    const codes = selected.map((a) => a.code).join(',');
    const res = await fetch(`/admin/api/route-pages/matrix?codes=${encodeURIComponent(codes)}`);
    const data = await res.json();
    if (!data.ok) { setError(data.error || 'فشل تحميل المصفوفة'); return; }
    const map = {};
    (data.existing || []).forEach((r) => { map[`${r.origin_iata}_${r.destination_iata}`] = r.status; });
    setExistingMap(map);
    setStep('grid');
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, maxWidth: step === 'grid' ? 'min(94vw, 900px)' : 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>🗺️ مصفوفة المسارات الناقصة</h2>
          <button type="button" onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {step === 'picker' && (
          <>
            <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, lineHeight: 1.6, margin: '0 0 14px' }}>
              اختار المطارات اللي عايز تشوف تغطيتها — هتظهرلك شبكة توريك أي توليفة موجودة (أخضر)، مسودة (أصفر)، أو ناقصة تماماً (فاضية، قابلة للدوس عليها للإنشاء الفوري).
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

            {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}

            <button type="button" onClick={loadMatrix} style={submitBtnStyle}>عرض المصفوفة</button>
          </>
        )}

        {step === 'grid' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: ADMIN_COLORS.tx2 }}>
                <span>🟩 منشور</span><span>🟨 مسودة</span><span>⬜ ناقص (دوس للإنشاء)</span>
              </div>
              <button type="button" onClick={() => setStep('picker')} style={backBtnStyle}>← تعديل الاختيار</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={thCellStyle} />
                    {selected.map((d) => <th key={d.code} style={thCellStyle}>{d.code}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {selected.map((o) => (
                    <tr key={o.code}>
                      <th style={{ ...thCellStyle, textAlign: 'right' }}>{o.code}</th>
                      {selected.map((d) => {
                        if (o.code === d.code) return <td key={d.code} style={diagCellStyle}>—</td>;
                        const status = existingMap[`${o.code}_${d.code}`];
                        if (status === 'published') return <td key={d.code} style={publishedCellStyle} title="منشور">🟩</td>;
                        if (status === 'draft') return <td key={d.code} style={draftCellStyle} title="مسودة">🟨</td>;
                        return (
                          <td key={d.code} style={missingCellStyle} title="ناقص — دوس للإنشاء" onClick={() => onQuickCreate(o, d)}>➕</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 50,
};
const modalStyle = {
  width: '100%', background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const closeBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.tx2, cursor: 'pointer', fontSize: 16 };
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
const backBtnStyle = {
  padding: '5px 12px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 12, cursor: 'pointer',
};
const thCellStyle = { padding: '6px 8px', background: ADMIN_COLORS.bg3, fontWeight: 700, whiteSpace: 'nowrap' };
const diagCellStyle = { padding: '6px 8px', background: ADMIN_COLORS.border, textAlign: 'center' };
const publishedCellStyle = { padding: '6px 8px', background: 'rgba(34,197,94,.25)', textAlign: 'center' };
const draftCellStyle = { padding: '6px 8px', background: 'rgba(234,179,8,.25)', textAlign: 'center' };
const missingCellStyle = { padding: '6px 8px', background: ADMIN_COLORS.bg3, textAlign: 'center', cursor: 'pointer' };
