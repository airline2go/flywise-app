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
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';
import { parseGscCsv, parseGscQueriesCsv } from '../../../../lib/seo/parse-gsc-csv.js';
import { buildOpportunityReport } from '../../../../lib/seo/report.js';
import { matchQueriesToRoutes, summarizeRouteQueries, queryPageMatch } from '../../../../lib/seo/query-intent.js';

const LS_KEY = 'airpiv_seo_gsc_csv_report';
const LS_QUERIES = 'airpiv_seo_gsc_queries';

const CATEGORY_META = {
  BREAKOUT: { label: 'BREAKOUT', color: ADMIN_COLORS.teal, bg: ADMIN_COLORS.tealGlow },
  VERY_HIGH: { label: 'VERY HIGH', color: ADMIN_COLORS.blue, bg: ADMIN_COLORS.blueBg },
  HIGH: { label: 'HIGH', color: ADMIN_COLORS.yellow, bg: ADMIN_COLORS.yellowBg },
  NORMAL: { label: 'NORMAL', color: ADMIN_COLORS.tx2, bg: 'transparent' },
  LOW: { label: 'LOW', color: ADMIN_COLORS.red, bg: ADMIN_COLORS.redBg },
};

const STATUS_OPTIONS = ['NEW', 'ANALYZED', 'OPTIMIZATION_READY', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'MONITORING', 'WINNER', 'NEEDS_REWORK', 'REJECTED'];

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState(null);
  const [analyses, setAnalyses] = useState({}); // slug -> { loading, error, data }
  const [expanded, setExpanded] = useState({}); // slug -> bool
  const [statusMap, setStatusMap] = useState({}); // slug -> { status, lastAnalyzedAt, lastOptimizedAt }
  const [queryRows, setQueryRows] = useState([]); // imported GSC query rows
  const [queryInfo, setQueryInfo] = useState(null); // { count, fileName, uploadedAt }

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

  // On mount: prefer a live API feed, then the shared server snapshot (Supabase),
  // then this browser's local CSV cache. Never inject sample/fake rows.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const cache = loadCsvCache();
    let handled = false;

    // 1) Live Google Search Console feed (if ever connected on the server).
    try {
      const res = await fetch('/admin/api/seo-opportunities');
      const data = await res.json();
      if (data.ok && data.connected && Array.isArray(data.rows) && data.rows.length) {
        setRows(data.rows);
        setSource('api');
        setDateRange(data.dateRange || null);
        setNote('');
        handled = true;
      } else if (data.ok) {
        setNote(data.note || '');
      }
    } catch { /* API optional */ }

    // 2) Shared server snapshot — the last report anyone uploaded (all staff,
    //    all devices see it). Only used when server storage is configured.
    if (!handled) {
      try {
        const res = await fetch('/admin/api/seo-opportunities/snapshot');
        const data = await res.json();
        if (data.ok && data.configured && data.snapshot && Array.isArray(data.snapshot.rows) && data.snapshot.rows.length) {
          const s = data.snapshot;
          setRows(s.rows);
          setSource('server');
          setUploadInfo({ count: s.row_count || s.rows.length, uploadedAt: s.created_at, fileName: s.file_name, uploadedBy: s.uploaded_by, warnings: [] });
          handled = true;
        }
      } catch { /* storage optional — fall back to local */ }
    }

    // 3) This browser's local cache (offline / storage-not-configured fallback).
    if (!handled) {
      if (cache) {
        setRows(cache.rows);
        setSource('csv');
        setUploadInfo(cache.info || null);
      } else {
        setRows([]);
        setSource(null);
      }
    }

    // Per-route lifecycle state (status + timestamps), shared via the server.
    try {
      const res = await fetch('/admin/api/seo-opportunities/status');
      const data = await res.json();
      if (data.ok && data.statuses) setStatusMap(data.statuses);
    } catch { /* status store optional */ }

    // Restore a previously-imported Queries export (browser-local).
    try {
      const raw = localStorage.getItem(LS_QUERIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rows)) { setQueryRows(parsed.rows); setQueryInfo(parsed.info || null); }
      }
    } catch { /* ignore */ }

    setLoading(false);
  }, [loadCsvCache]);

  // [Phase 4] Import a GSC "Queries" export (query text + metrics). Matched to
  // routes by city-name detection — no page column needed.
  function onQueryFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows: qrows, meta } = parseGscQueriesCsv(String(reader.result || ''));
        if (!qrows.length) { setError((meta.warnings || []).join(' ') || 'لم يتم العثور على استعلامات في الملف.'); return; }
        const info = { count: qrows.length, fileName: file.name, uploadedAt: new Date().toISOString() };
        setQueryRows(qrows);
        setQueryInfo(info);
        setError('');
        try { localStorage.setItem(LS_QUERIES, JSON.stringify({ rows: qrows, info })); } catch { /* quota */ }
      } catch {
        setError('تعذّر قراءة ملف الاستعلامات.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // slug -> matched queries (recomputed when either the report or queries change).
  const queryMap = useMemo(() => (queryRows.length ? matchQueriesToRoutes(queryRows, rows) : {}), [queryRows, rows]);

  // Persist a route's status change (optimistic).
  async function saveStatus(r, status) {
    const key = r.slug;
    if (!key) return;
    setStatusMap((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), status } }));
    try {
      const res = await fetch('/admin/api/seo-opportunities/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: key, language: r.language || 'de', status }),
      });
      const j = await res.json();
      if (j.ok && j.status) setStatusMap((prev) => ({ ...prev, [key]: j.status }));
      else if (j && j.configured === false) setNote('لتتبّع الحالة على السيرفر فعّل SUPABASE_SERVICE_ROLE_KEY (محفوظ محلياً في العرض فقط الآن).');
    } catch { /* keep optimistic value */ }
  }

  // Record that a route was just analyzed (bumps NEW → ANALYZED, stamps time).
  async function markAnalyzed(r) {
    const key = r.slug;
    if (!key) return;
    const cur = (statusMap[key] && statusMap[key].status) || r.status || 'NEW';
    try {
      const res = await fetch('/admin/api/seo-opportunities/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: key, language: r.language || 'de', markAnalyzed: true, status: cur === 'NEW' ? 'ANALYZED' : undefined }),
      });
      const j = await res.json();
      if (j.ok && j.status) setStatusMap((prev) => ({ ...prev, [key]: j.status }));
    } catch { /* non-critical */ }
  }

  useEffect(() => { const t = setTimeout(() => load(), 0); return () => clearTimeout(t); }, [load]);

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { rows: raw, meta } = parseGscCsv(String(reader.result || ''));
        if (!raw.length) {
          setError((meta.warnings || []).join(' ') || 'لم يتم العثور على صفوف مسارات صالحة في الملف.');
          return;
        }
        const report = buildOpportunityReport(raw);
        const info = { count: report.length, uploadedAt: new Date().toISOString(), warnings: meta.warnings || [], fileName: file.name };
        setRows(report);
        setUploadInfo(info);
        setError('');
        setFilter('');
        setSort(null);
        // Always keep a local copy (offline fallback / storage-not-configured).
        try { localStorage.setItem(LS_KEY, JSON.stringify({ rows: report, info })); } catch { /* quota */ }

        // Persist to the shared server store so every device/staff member sees it.
        setSaving(true);
        try {
          const res = await fetch('/admin/api/seo-opportunities/snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: report, source: 'csv', fileName: file.name, dateRange: meta.dateRange || null }),
          });
          const j = await res.json();
          if (j.ok && j.configured && j.saved) {
            setSource('server');
            setUploadInfo({ ...info, uploadedBy: null });
            setNote('');
          } else {
            setSource('csv'); // saved locally only
            if (j && j.configured === false) setNote('لم يُفعَّل التخزين على السيرفر بعد — محفوظ محلياً على هذا المتصفّح فقط.');
          }
        } catch {
          setSource('csv');
        } finally {
          setSaving(false);
        }
      } catch {
        setError('تعذّر قراءة الملف. تأكد أنه ملف CSV صالح من Search Console.');
        setSaving(false);
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
    setAnalyses({});
    setExpanded({});
  }

  // [Phase 3] Fetch a read-only SEO analysis of the route's real rendered page.
  async function analyzeRow(r) {
    const key = r.slug || r.url;
    setExpanded((prev) => ({ ...prev, [key]: true }));
    if (analyses[key] && analyses[key].data) return; // already analyzed
    setAnalyses((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const p = new URLSearchParams({ slug: r.slug || '', lang: r.language || 'de' });
      if (r.impressions != null) p.set('impressions', r.impressions);
      if (r.clicks != null) p.set('clicks', r.clicks);
      if (r.position != null) p.set('position', r.position);
      const res = await fetch(`/admin/api/seo-opportunities/analyze?${p.toString()}`);
      const data = await res.json();
      if (data.ok) { setAnalyses((prev) => ({ ...prev, [key]: { data } })); markAnalyzed(r); }
      else setAnalyses((prev) => ({ ...prev, [key]: { error: data.error || 'فشل التحليل' } }));
    } catch {
      setAnalyses((prev) => ({ ...prev, [key]: { error: 'تعذّر الاتصال بالتحليل' } }));
    }
  }

  function toggleExpand(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>جارٍ الحفظ…</span>}
          <label style={{ ...ghostBtn, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            ⬆️ رفع الصفحات (Pages)
            <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={saving} style={{ display: 'none' }} />
          </label>
          <label style={{ ...ghostBtn, cursor: 'pointer' }}>
            🔎 رفع الاستعلامات (Queries)
            <input type="file" accept=".csv,text/csv" onChange={onQueryFile} style={{ display: 'none' }} />
          </label>
          {source === 'csv' && <button type="button" onClick={clearCsv} style={ghostBtn}>🗑 مسح المحلي</button>}
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
      {source === 'server' && uploadInfo && (
        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.teal}55`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          🗄️ مُخزَّن على السيرفر (مشترك لكل الأجهزة والموظفين){uploadInfo.fileName ? ` · ${uploadInfo.fileName}` : ''} · {uploadInfo.count} صف · {new Date(uploadInfo.uploadedAt).toLocaleString('en-GB')}{uploadInfo.uploadedBy ? ` · بواسطة ${uploadInfo.uploadedBy}` : ''}
        </div>
      )}
      {source === 'csv' && uploadInfo && (
        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          📄 محفوظ محلياً على هذا المتصفّح فقط{uploadInfo.fileName ? ` (${uploadInfo.fileName})` : ''} · {uploadInfo.count} صف · {new Date(uploadInfo.uploadedAt).toLocaleString('en-GB')}
          {note ? <div style={{ color: ADMIN_COLORS.yellow, marginTop: 4 }}>⚠️ {note}</div> : null}
          {uploadInfo.warnings && uploadInfo.warnings.length ? <div style={{ color: ADMIN_COLORS.yellow, marginTop: 4 }}>⚠️ {uploadInfo.warnings.join(' ')}</div> : null}
        </div>
      )}
      {source === 'api' && (
        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 12 }}>
          🔗 المصدر: اتصال Google Search Console المباشر{dateRange ? ` · ${dateRange}` : ''}
        </div>
      )}
      {queryInfo && (
        <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, marginBottom: 12 }}>
          🔎 استعلامات مستوردة: {queryInfo.count} · طُوبقت على {Object.keys(queryMap).length} مسار · اضغط «Analyze» لعرض استعلامات كل مسار ونيّتها
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
                <th style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center' }}>تحليل</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                const key = r.url || r.slug;
                const a = analyses[key];
                const open = !!expanded[key];
                return (
                  <Fragment key={key}>
                    <tr style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
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
                      <td style={{ ...td, color: (statusMap[key] && statusMap[key].lastOptimizedAt) ? ADMIN_COLORS.tx : ADMIN_COLORS.tx3 }}>{(statusMap[key] && statusMap[key].lastOptimizedAt) ? new Date(statusMap[key].lastOptimizedAt).toLocaleDateString('en-GB') : '—'}</td>
                      <td style={td}>
                        <select
                          value={(statusMap[key] && statusMap[key].status) || (STATUS_OPTIONS.includes(r.status) ? r.status : 'NEW')}
                          onChange={(e) => saveStatus(r, e.target.value)}
                          style={{ background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 6, padding: '3px 6px', fontSize: 11 }}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button type="button" onClick={() => (a ? toggleExpand(key) : analyzeRow(r))} disabled={a && a.loading} style={analyzeBtn}>
                          {a && a.loading ? '…' : a && a.data ? (open ? 'إخفاء' : 'عرض') : '🔍 Analyze'}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={11} style={{ padding: 0, background: ADMIN_COLORS.bg }}>
                          {a && a.loading && <div style={{ padding: 14, color: ADMIN_COLORS.tx2, fontSize: 12.5 }}>جارٍ تحليل الصفحة الحقيقية…</div>}
                          {a && a.error && <div style={{ padding: 14, color: ADMIN_COLORS.red, fontSize: 12.5 }}>{a.error}</div>}
                          {a && a.data && <AnalysisPanel a={a.data} queries={queryMap[key]} />}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// [Phase 3/14] Read-only analysis panel for one route's real rendered page.
const FACTOR_LABELS = {
  QUERY_OPPORTUNITY: 'فرصة الاستعلام',
  CONTENT_MATCH: 'مطابقة المحتوى',
  CTR_OPPORTUNITY: 'فرصة CTR',
  TECHNICAL_HEALTH: 'الصحة التقنية',
  INTERNAL_LINKING: 'الروابط الداخلية',
  DATA_COMPLETENESS: 'اكتمال البيانات',
};
const FLAG_COLOR = { issue: ADMIN_COLORS.red, warn: ADMIN_COLORS.yellow, opportunity: ADMIN_COLORS.teal, observation: ADMIN_COLORS.tx2 };
function scoreColor(s) {
  if (s == null) return ADMIN_COLORS.tx3;
  if (s >= 75) return ADMIN_COLORS.teal;
  if (s >= 45) return ADMIN_COLORS.yellow;
  return ADMIN_COLORS.red;
}

const INTENT_LABEL = { duration: 'الوقت (Flugzeit)', direct: 'مباشر (Direkt)', price: 'السعر', distance: 'المسافة', flight: 'عام' };

function QueriesSection({ queries, content }) {
  if (!queries || !queries.length) {
    return <div style={{ fontSize: 12, color: ADMIN_COLORS.tx3 }}>لا استعلامات مطابقة — ارفع ملف «Queries» من Search Console لعرض استعلامات هذا المسار ونيّتها.</div>;
  }
  const s = summarizeRouteQueries(queries);
  const match = queryPageMatch(s.dominantIntent, content);
  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: ADMIN_COLORS.tx3 }}>النية السائدة: </span>
        <span style={{ color: ADMIN_COLORS.teal, fontWeight: 700 }}>{INTENT_LABEL[s.dominantIntent] || s.dominantIntent}</span>
        {match && match.covered != null && (
          <span style={{ marginInlineStart: 8, color: match.covered ? ADMIN_COLORS.teal : ADMIN_COLORS.yellow }}>
            {match.covered ? '✓ مغطّاة في الصفحة' : '⚠ فجوة محتوى محتملة'}
          </span>
        )}
      </div>
      {queries.slice(0, 6).map((q, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11.5, padding: '2px 0', borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
          <span style={{ color: i === 0 ? ADMIN_COLORS.teal : ADMIN_COLORS.tx, flex: 1, wordBreak: 'break-word' }}>{i === 0 ? '★ ' : ''}{q.query}</span>
          <span style={{ color: ADMIN_COLORS.tx3, whiteSpace: 'nowrap' }}>{q.impressions ?? '—'} imp · pos {q.position != null ? q.position.toFixed(1) : '—'} · {INTENT_LABEL[q.intent] || q.intent}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 6 }}>★ الاستعلام الأساسي · المطابقة بأسماء المدن (تقديرية — راجعها).</div>
    </div>
  );
}

function AnalysisPanel({ a, queries }) {
  const el = a.elements || {};
  const rowStyle = { display: 'flex', gap: 8, fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${ADMIN_COLORS.border}` };
  const lbl = { color: ADMIN_COLORS.tx3, minWidth: 130, flexShrink: 0 };
  const val = { color: ADMIN_COLORS.tx, wordBreak: 'break-word' };
  return (
    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
      {/* Extracted elements */}
      <div>
        <h3 style={panelH}>عناصر الصفحة الحقيقية</h3>
        <div style={rowStyle}><span style={lbl}>Title ({el.titleLength})</span><span style={val}>{el.title || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>Meta ({el.metaLength})</span><span style={val}>{el.metaDescription || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>H1</span><span style={val}>{el.h1 || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>Canonical</span><span style={val}>{el.canonical || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>Hreflang</span><span style={val}>{el.hreflangCount}</span></div>
        <div style={rowStyle}><span style={lbl}>Robots</span><span style={val}>{el.robots || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>Schema</span><span style={val}>{(el.schemaTypes || []).join(', ') || '—'}</span></div>
        <div style={rowStyle}><span style={lbl}>Internal links</span><span style={val}>{el.internalLinks ? el.internalLinks.total : 0}</span></div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}><span style={lbl}>Content</span><span style={val}>
          {['hasFlightTime', 'hasDistance', 'hasAirlines', 'hasDirectInfo'].map((k) => `${(el.content && el.content[k]) ? '✓' : '✗'} ${k.replace('has', '')}`).join(' · ')} · FAQ {el.content ? el.content.faqCount : 0}
        </span></div>
      </div>
      {/* Score factors */}
      <div>
        <h3 style={panelH}>درجة SEO {a.score != null ? `— ${a.score}/100` : ''} <span style={{ color: ADMIN_COLORS.tx3, fontWeight: 400 }}>({a.coverage} عوامل)</span></h3>
        {Object.entries(a.factors || {}).map(([k, f]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: ADMIN_COLORS.tx }}>{FACTOR_LABELS[k] || k}</span>
              <span style={{ color: scoreColor(f.score), fontWeight: 700 }}>{f.available ? `${f.score}` : 'غير متوفر'}</span>
            </div>
            <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 2 }}>{f.reason}</div>
          </div>
        ))}
      </div>
      {/* Search queries & intent (Phase 4/5) */}
      <div>
        <h3 style={panelH}>استعلامات البحث والنية</h3>
        <QueriesSection queries={queries} content={el.content} />
      </div>
      {/* Flags */}
      <div>
        <h3 style={panelH}>ملاحظات ({(a.flags || []).length})</h3>
        {(a.flags || []).length === 0 && <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>لا ملاحظات — الصفحة سليمة.</div>}
        {(a.flags || []).map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: FLAG_COLOR[f.level] || ADMIN_COLORS.tx2, padding: '3px 0' }}>• {f.text}</div>
        ))}
        <div style={{ marginTop: 10, fontSize: 11, color: ADMIN_COLORS.tx3, lineHeight: 1.6 }}>
          تحليل للقراءة فقط — لا يطبّق أي تغيير. اقتراحات العناوين/الوصف والموافقة قادمة في مرحلة لاحقة.
          {a.url && <> · <a href={a.url} target="_blank" rel="noreferrer" style={{ color: ADMIN_COLORS.teal }}>فتح الصفحة</a></>}
        </div>
      </div>
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
const analyzeBtn = { background: 'transparent', color: ADMIN_COLORS.teal, border: `1px solid ${ADMIN_COLORS.teal}55`, borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const panelH = { fontSize: 12.5, fontWeight: 700, color: ADMIN_COLORS.tx, marginBottom: 8 };
const chip = (active) => ({
  background: active ? ADMIN_COLORS.tealGlow : ADMIN_COLORS.bg2,
  color: active ? ADMIN_COLORS.teal : ADMIN_COLORS.tx2,
  border: `1px solid ${active ? ADMIN_COLORS.teal : ADMIN_COLORS.border}`,
  borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
});
