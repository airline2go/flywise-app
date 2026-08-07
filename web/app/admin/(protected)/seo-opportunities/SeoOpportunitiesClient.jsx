'use client';

// [SEO-OPPORTUNITY §3/§4/§8] The admin SEO opportunity report. It is an
// OPPORTUNITY DETECTOR only — it surfaces route pages worth investigating from
// real Google Search Console data and never changes titles/meta/content itself
// (any SEO edit stays a separate, controlled action). Data + default sort come
// from /admin/api/seo-opportunities (server-side normalize → classify → sort);
// this component adds interactive column sorting and a category filter.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

// Category → { label, color } for the badge. Order mirrors the report's default
// sort (BREAKOUT → VERY_HIGH → HIGH → NORMAL → LOW).
const CATEGORY_META = {
  BREAKOUT: { label: 'BREAKOUT', color: ADMIN_COLORS.teal, bg: ADMIN_COLORS.tealGlow },
  VERY_HIGH: { label: 'VERY HIGH', color: ADMIN_COLORS.blue, bg: ADMIN_COLORS.blueBg },
  HIGH: { label: 'HIGH', color: ADMIN_COLORS.yellow, bg: ADMIN_COLORS.yellowBg },
  NORMAL: { label: 'NORMAL', color: ADMIN_COLORS.tx2, bg: 'transparent' },
  LOW: { label: 'LOW', color: ADMIN_COLORS.red, bg: ADMIN_COLORS.redBg },
};

const STATUS_OPTIONS = ['NEW', 'ANALYZED', 'OPTIMIZED', 'MONITORING', 'WINNER', 'NEEDS_REWORK'];

// Threshold reference shown as a legend, kept in sync with lib/seo/gsc-opportunity.
const THRESHOLDS = [
  ['BREAKOUT', 'Position ≤ 5 و Impressions ≥ 10'],
  ['VERY HIGH', 'Impressions ≥ 40 و Position ≤ 12'],
  ['HIGH', 'Impressions ≥ 20 و Position ≤ 15'],
  ['NORMAL', 'بيانات موجودة بدون تطابق (محايد)'],
  ['LOW', 'Position > 25 و Impressions < 5'],
];

function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || { label: '—', color: ADMIN_COLORS.tx3, bg: 'transparent' };
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, padding: '3px 8px', borderRadius: 6, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33` }}>
      {meta.label}
    </span>
  );
}

const fmtPct = (v) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const fmtNum = (v) => (v == null ? 'n/a' : v.toLocaleString('en-US'));
const fmtPos = (v) => (v == null ? '—' : v.toFixed(2));

export default function SeoOpportunitiesClient() {
  const [rows, setRows] = useState([]);
  const [connected, setConnected] = useState(true);
  const [note, setNote] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(''); // category filter
  const [sort, setSort] = useState(null); // { key, dir } — null = server default (§4)

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/admin/api/seo-opportunities');
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'فشل تحميل التقرير'); setRows([]); }
      else {
        setRows(data.rows || []);
        setConnected(data.connected !== false);
        setNote(data.note || '');
        setDateRange(data.dateRange || null);
      }
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => load(), 0); return () => clearTimeout(t); }, [load]);

  const view = useMemo(() => {
    let out = filter ? rows.filter((r) => r.category === filter) : rows.slice();
    if (sort) {
      const { key, dir } = sort;
      const mul = dir === 'asc' ? 1 : -1;
      out = out.slice().sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1; // unknowns last regardless of dir
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
        return String(av).localeCompare(String(bv)) * mul;
      });
    }
    return out;
  }, [rows, filter, sort]);

  const counts = useMemo(() => {
    const c = {};
    for (const r of rows) c[r.category] = (c[r.category] || 0) + 1;
    return c;
  }, [rows]);

  function toggleSort(key) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null; // third click → back to server default
    });
  }

  const sortArrow = (key) => (sort && sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>فرص السيو (Search Console)</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4, maxWidth: 640 }}>
            كاشف فرص فقط — يرتّب صفحات المسارات حسب فرصتها في التصنيف اعتماداً على بيانات Google Search Console الحقيقية.
            لا يغيّر أي عنوان أو وصف أو محتوى؛ أي تعديل سيو يبقى إجراءً منفصلاً ومتحكَّماً به.
          </p>
        </div>
        <button type="button" onClick={load} style={ghostBtn}>↻ تحديث</button>
      </div>

      {/* Threshold legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {THRESHOLDS.map(([label, rule]) => (
          <span key={label} style={{ fontSize: 11.5, color: ADMIN_COLORS.tx2, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 6, padding: '4px 9px' }}>
            <strong style={{ color: ADMIN_COLORS.tx }}>{label}</strong>: {rule}
          </span>
        ))}
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" onClick={() => setFilter('')} style={chip(filter === '')}>الكل ({rows.length})</button>
        {['BREAKOUT', 'VERY_HIGH', 'HIGH', 'NORMAL', 'LOW'].map((c) => (
          <button key={c} type="button" onClick={() => setFilter(filter === c ? '' : c)} style={chip(filter === c)}>
            {CATEGORY_META[c].label} ({counts[c] || 0})
          </button>
        ))}
      </div>

      {dateRange && (
        <p style={{ fontSize: 12, color: ADMIN_COLORS.tx3, marginBottom: 10 }}>نطاق البيانات: {dateRange}</p>
      )}

      {loading && <p style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>جارٍ التحميل…</p>}
      {error && <p style={{ color: ADMIN_COLORS.red, fontSize: 13 }}>{error}</p>}

      {!loading && !error && !connected && (
        <div style={{ padding: 20, background: ADMIN_COLORS.bg2, border: `1px dashed ${ADMIN_COLORS.border}`, borderRadius: 10, color: ADMIN_COLORS.tx2, fontSize: 13.5, lineHeight: 1.7 }}>
          <strong style={{ color: ADMIN_COLORS.tx }}>لا يوجد اتصال بـ Google Search Console بعد.</strong>
          <div style={{ marginTop: 6 }}>{note || 'اربط GSC على الخادم لتعبئة هذا التقرير. البنية جاهزة (تطبيع → تصنيف → تقرير) وستعمل تلقائياً بمجرد توفّر البيانات.'}</div>
        </div>
      )}

      {!loading && !error && connected && view.length === 0 && (
        <p style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>لا توجد صفوف مطابقة.</p>
      )}

      {!loading && !error && view.length > 0 && (
        <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 900 }}>
            <thead>
              <tr style={{ background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx2, textAlign: 'right' }}>
                <Th onClick={() => toggleSort('slug')}>المسار{sortArrow('slug')}</Th>
                <Th onClick={() => toggleSort('language')}>اللغة{sortArrow('language')}</Th>
                <Th onClick={() => toggleSort('primaryQuery')}>الاستعلام الأساسي{sortArrow('primaryQuery')}</Th>
                <Th onClick={() => toggleSort('impressions')} num>ظهور{sortArrow('impressions')}</Th>
                <Th onClick={() => toggleSort('clicks')} num>نقرات{sortArrow('clicks')}</Th>
                <Th onClick={() => toggleSort('ctr')} num>CTR{sortArrow('ctr')}</Th>
                <Th onClick={() => toggleSort('position')} num>الترتيب{sortArrow('position')}</Th>
                <Th onClick={() => toggleSort('category')}>الفئة{sortArrow('category')}</Th>
                <Th onClick={() => toggleSort('lastOptimizedAt')}>آخر تحسين{sortArrow('lastOptimizedAt')}</Th>
                <Th onClick={() => toggleSort('status')}>الحالة{sortArrow('status')}</Th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.url || r.slug} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                  <td style={td}>
                    <a href={r.url && r.url.startsWith('http') ? r.url : `https://airpiv.com${r.url || `/flights/${r.slug}`}`} target="_blank" rel="noreferrer" style={{ color: ADMIN_COLORS.teal, textDecoration: 'none' }}>
                      {r.slug || r.url}
                    </a>
                  </td>
                  <td style={td}>{r.language || '—'}</td>
                  <td style={{ ...td, color: r.primaryQuery ? ADMIN_COLORS.tx : ADMIN_COLORS.tx3 }}>{r.primaryQuery || 'n/a'}</td>
                  <td style={tdNum}>{fmtNum(r.impressions)}</td>
                  <td style={{ ...tdNum, color: r.clicks == null ? ADMIN_COLORS.tx3 : ADMIN_COLORS.tx }}>{fmtNum(r.clicks)}</td>
                  <td style={{ ...tdNum, color: r.ctr == null ? ADMIN_COLORS.tx3 : ADMIN_COLORS.tx }}>{fmtPct(r.ctr)}</td>
                  <td style={tdNum}>{fmtPos(r.position)}</td>
                  <td style={td}><CategoryBadge category={r.category} /></td>
                  <td style={{ ...td, color: r.lastOptimizedAt ? ADMIN_COLORS.tx : ADMIN_COLORS.tx3 }}>{r.lastOptimizedAt || '—'}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, color: ADMIN_COLORS.tx2 }}>{STATUS_OPTIONS.includes(r.status) ? r.status : 'ANALYZED'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, onClick, num }) {
  return (
    <th onClick={onClick} style={{ padding: '10px 12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', textAlign: num ? 'left' : 'right', userSelect: 'none' }}>
      {children}
    </th>
  );
}

const td = { padding: '9px 12px', color: ADMIN_COLORS.tx, textAlign: 'right', whiteSpace: 'nowrap' };
const tdNum = { ...td, textAlign: 'left', fontVariantNumeric: 'tabular-nums' };
const ghostBtn = { background: 'transparent', color: ADMIN_COLORS.tx2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer' };
const chip = (active) => ({
  background: active ? ADMIN_COLORS.tealGlow : ADMIN_COLORS.bg2,
  color: active ? ADMIN_COLORS.teal : ADMIN_COLORS.tx2,
  border: `1px solid ${active ? ADMIN_COLORS.teal : ADMIN_COLORS.border}`,
  borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
});
