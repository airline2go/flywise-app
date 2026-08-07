'use client';

// [SEO-OPPORTUNITY §3/§4/§8] The admin SEO opportunity report. It is an
// OPPORTUNITY DETECTOR only — it surfaces route pages worth investigating from
// real Google Search Console data and never changes titles/meta/content itself
// (any SEO edit stays a separate, controlled action).
//
// Two data sources, both routed through the SAME pure classifier/report:
//   1. CSV IMPORT (default) — upload a GSC "Pages" export; it is parsed,
//      classified and sorted entirely in the browser (no API, no server round
//      trip) and cached in localStorage so it survives a reload.
//   2. LIVE API — if a Google Search Console feed is later connected on the
//      server (/admin/api/seo-opportunities), it takes precedence automatically.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';
import { parseGscCsv } from '../../../../lib/seo/parse-gsc-csv.js';
import { buildOpportunityReport } from '../../../../lib/seo/report.js';

const LS_KEY = 'airpiv_seo_gsc_csv_report';

const CATEGORY_META = {
  BREAKOUT: { label: 'BREAKOUT', color: ADMIN_COLORS.teal, bg: ADMIN_COLORS.tealGlow },
  VERY_HIGH: { label: 'VERY HIGH', color: ADMIN_COLORS.blue, bg: ADMIN_COLORS.blueBg },
  HIGH: { label: 'HIGH', color: ADMIN_COLORS.yellow, bg: ADMIN_COLORS.yellowBg },
  NORMAL: { label: 'NORMAL', color: ADMIN_COLORS.tx2, bg: 'transparent' },
  LOW: { label: 'LOW', color: ADMIN_COLORS.red, bg: ADMIN_COLORS.redBg },
};

const STATUS_OPTIONS = ['NEW', 'ANALYZED', 'OPTIMIZED', 'MONITORING', 'WINNER', 'NEEDS_REWORK'];

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
  const [source, setSource] = useState(null); // 'api' | 'csv' | null
  const [note, setNote] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [uploadInfo, setUploadInfo] = useState(null); // { count, uploadedAt, warnings, fileName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState(null);

  // Restore a previously-uploaded CSV report from localStorage.
  const loadCsvCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rows)) return parsed;
    } catch { /* ignore corrupt cache */ }
    return null;
  }, []);

  // On mount: prefer a live API feed if one is connected; otherwise fall back to
  // the cached CSV import. Never inject sample/fake rows.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const cache = loadCsvCache();
    let usedApi = false;
    try {
      const res = await fetch('/admin/api/seo-opportunities');
      const data = await res.json();
      if (data.ok && data.connected && Array.isArray(data.rows) && data.rows.length) {
        setRows(data.rows);
        setSource('api');
        setDateRange(data.dateRange || null);
        setNote('');
        usedApi = true;
      } else if (data.ok) {
        setNote(data.note || '');
      }
    } catch { /* API optional — CSV import is the primary path */ }

    if (!usedApi) {
      if (cache) {
        setRows(cache.rows);
        setSource('csv');
        setUploadInfo(cache.info || null);
      } else {
        setRows([]);
        setSource(null);
      }
    }
    setLoading(false);
  }, [loadCsvCache]);

  useEffect(() => { const t = setTimeout(() => load(), 0); return () => clearTimeout(t); }, [load]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows: raw, meta } = parseGscCsv(String(reader.result || ''));
        if (!raw.length) {
          setError((meta.warnings || []).join(' ') || 'لم يتم العثور على صفوف مسارات صالحة في الملف.');
          return;
        }
        const report = buildOpportunityReport(raw);
        const info = { count: report.length, uploadedAt: new Date().toISOString(), warnings: meta.warnings || [], fileName: file.name };
        setRows(report);
        setSource('csv');
        setUploadInfo(info);
        setError('');
        setFilter('');
        setSort(null);
        try { localStorage.setItem(LS_KEY, JSON.stringify({ rows: report, info })); } catch { /* quota — still shown this session */ }
      } catch {
        setError('تعذّر قراءة الملف. تأكد أنه ملف CSV صالح من Search Console.');
      }
    };
    reader.onerror = () => setError('تعذّر قراءة الملف.');
    reader.readAsText(file);
    e.target.value = ''; // allow re-uploading the same file name
  }

  function clearCsv() {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setRows([]);
    setSource(null);
    setUploadInfo(null);
    setFilter('');
    setSort(null);
  }

  const view = useMemo(() => {
    let out = filter ? rows.filter((r) => r.category === filter) : rows.slice();
    if (sort) {
      const { key, dir } = sort;
      const mul = dir === 'asc' ? 1 : -1;
      out = out.slice().sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
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
      return null;
    });
  }
  const sortArrow = (key) => (sort && sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>فرص السيو (Search Console)</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4, maxWidth: 660 }}>
            كاشف فرص فقط — يرتّب صفحات المسارات حسب فرصتها في التصنيف اعتماداً على بيانات Google Search Console الحقيقية.
            لا يغيّر أي عنوان أو وصف أو محتوى؛ أي تعديل سيو يبقى إجراءً منفصلاً ومتحكَّماً به.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ ...ghostBtn, cursor: 'pointer' }}>
            ⬆️ رفع CSV
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
          </label>
          {source === 'csv' && <button type="button" onClick={clearCsv} style={ghostBtn}>🗑 مسح</button>}
        </div>
      </div>

      {/* Threshold legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {THRESHOLDS.map(([label, rule]) => (
          <span key={label} style={{ fontSize: 11.5, color: ADMIN_COLORS.tx2, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 6, padding: '4px 9px' }}>
            <strong style={{ color: ADMIN_COLORS.tx }}>{label}</strong>: {rule}
          </span>
        ))}
      </div>

      {/* Source banner */}
      {source === 'csv' && uploadInfo && (
        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          📄 المصدر: ملف CSV مرفوع{uploadInfo.fileName ? ` (${uploadInfo.fileName})` : ''} · {uploadInfo.count} صف · {new Date(uploadInfo.uploadedAt).toLocaleString('en-GB')}
          {uploadInfo.warnings && uploadInfo.warnings.length ? <div style={{ color: ADMIN_COLORS.yellow, marginTop: 4 }}>⚠️ {uploadInfo.warnings.join(' ')}</div> : null}
        </div>
      )}
      {source === 'api' && (
        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 12 }}>
          🔗 المصدر: اتصال Google Search Console المباشر{dateRange ? ` · ${dateRange}` : ''}
        </div>
      )}

      {/* Category filter chips */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button type="button" onClick={() => setFilter('')} style={chip(filter === '')}>الكل ({rows.length})</button>
          {['BREAKOUT', 'VERY_HIGH', 'HIGH', 'NORMAL', 'LOW'].map((c) => (
            <button key={c} type="button" onClick={() => setFilter(filter === c ? '' : c)} style={chip(filter === c)}>
              {CATEGORY_META[c].label} ({counts[c] || 0})
            </button>
          ))}
        </div>
      )}

      {loading && <p style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>جارٍ التحميل…</p>}
      {error && <p style={{ color: ADMIN_COLORS.red, fontSize: 13 }}>{error}</p>}

      {/* Empty state — how to import */}
      {!loading && rows.length === 0 && (
        <div style={{ padding: 20, background: ADMIN_COLORS.bg2, border: `1px dashed ${ADMIN_COLORS.border}`, borderRadius: 10, color: ADMIN_COLORS.tx2, fontSize: 13.5, lineHeight: 1.8 }}>
          <strong style={{ color: ADMIN_COLORS.tx }}>ارفع تقرير Search Console لبدء التحليل.</strong>
          <ol style={{ margin: '10px 0 0', paddingInlineStart: 20 }}>
            <li>افتح Google Search Console → <b>Leistung / Performance</b>.</li>
            <li>اختر تبويب <b>Seiten / Pages</b> والفترة الزمنية المطلوبة.</li>
            <li>اضغط <b>Export / Exportieren → CSV</b> (ملف الصفحات «Pages»).</li>
            <li>ارجع هنا واضغط <b>⬆️ رفع CSV</b> وارفع الملف.</li>
          </ol>
          <div style={{ marginTop: 10, color: ADMIN_COLORS.tx3 }}>
            كل الحساب يتم داخل متصفّحك — لا يُرسَل الملف لأي خادم. {note ? `(${note})` : ''}
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && view.length === 0 && (
        <p style={{ color: ADMIN_COLORS.tx2, fontSize: 13 }}>لا توجد صفوف مطابقة لهذا الفلتر.</p>
      )}

      {!loading && view.length > 0 && (
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
                  <td style={td}><span style={{ fontSize: 11, color: ADMIN_COLORS.tx2 }}>{STATUS_OPTIONS.includes(r.status) ? r.status : 'ANALYZED'}</span></td>
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
