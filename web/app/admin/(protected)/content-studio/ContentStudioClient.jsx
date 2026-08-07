'use client';

// [SOCIAL-STUDIO-UI] Interactive Content Studio: score a route/page as a content
// opportunity and generate ready-to-post social copy for every platform and
// language — all client-side on top of the pure, tested lib/social engines. No
// network, no persistence yet (that's the next increment); the operator fills
// the signals today, and GSC / price-history auto-fill and a save-to-queue land
// later. Honest by design: the opportunity score only counts signals that are
// actually provided.
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ADMIN_COLORS as C } from '../../../../lib/admin/theme';
import generatorMod from '../../../../lib/social/generator';
import opportunityMod from '../../../../lib/social/opportunity';
import imageCardMod from '../../../../lib/social/image-card';
import recommendationsMod from '../../../../lib/social/recommendations';

const { generateSocialPost, PLATFORMS, LANGUAGES, TEMPLATE_TYPES } = generatorMod;
const { scoreOpportunity, rankOpportunities } = opportunityMod;
const { buildImageCard } = imageCardMod;
const { buildRecommendations } = recommendationsMod;

// Severity → color token for the smart-recommendations panel.
const REC_SEVERITY = { high: 'yellow', medium: 'blue', low: 'tx2' };

// ── Branded social-image card helpers (client-side, deterministic) ──
// Trigger a browser download for a blob.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCardSvg(card) {
  downloadBlob(new Blob([card.svg], { type: 'image/svg+xml' }), `${card.filename}.svg`);
}

// Rasterize the self-contained SVG to PNG via a canvas (no external refs, so the
// canvas is never tainted and toBlob succeeds).
function downloadCardPng(card, onError) {
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = card.width;
      canvas.height = card.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, card.width, card.height);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${card.filename}.png`);
        else if (onError) onError();
      }, 'image/png');
    } catch {
      if (onError) onError();
    }
  };
  img.onerror = () => { if (onError) onError(); };
  img.src = card.dataUri;
}

// Reconstruct card inputs from a stored queue row (honest: no price is parsed
// back out of the body, so queue cards never show a fabricated number). The
// title carries the headline — "Origin → Destination", the city, or the title.
function postToCardOpts(p) {
  const base = { type: p.template_type, platform: p.platform, lang: p.language };
  if (p.template_type === 'flight_deal') {
    const parts = String(p.title || '').split('→').map((x) => x.trim());
    return { ...base, data: { origin: parts[0] || '', destination: parts[1] || '' } };
  }
  if (p.template_type === 'city_guide') return { ...base, data: { city: p.title || '' } };
  return { ...base, data: { title: p.title || '' } };
}

// Real price (from the DB) formatted with its currency symbol — never invented.
function fmtPrice(v, currency) {
  if (v == null) return '';
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '';
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : (currency || '');
  return sym === '€' ? `${n} €` : `${sym}${n}`;
}

// Map a content_opportunities row to the scoring model's inputs.
function oppInputs(o) {
  return {
    priceDrop: Number(o.price_drop_pct) > 0 ? Number(o.price_drop_pct) : null,
    popularity: o.route_score != null ? Number(o.route_score) : null,
    airlineCount: o.airline_count != null ? Number(o.airline_count) : null,
    direct: o.all_direct ? 'all' : (o.direct_flight_available ? 'some' : null),
  };
}

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const LEVELS = ['', 'low', 'medium', 'high'];
const TYPE_LABEL = { flight_deal: 'عرض رحلة', city_guide: 'دليل مدينة', blog_promo: 'ترويج مقال' };
const LEVEL_LABEL = { '': '—', low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };
const STATUS_ORDER = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'];
const STATUS_LABEL = { draft: 'مسودة', pending_review: 'بانتظار المراجعة', approved: 'معتمد', scheduled: 'مجدول', published: 'منشور', failed: 'فشل' };
const ACTION_LABEL = { created: 'أُنشئ', updated: 'عُدّل', edited: 'تحرير المحتوى', status_changed: 'تغيّرت الحالة', deleted: 'حُذف', reverted: 'استرجاع نسخة', auto_generated: 'توليد تلقائي' };

// Compact "time ago" in Arabic for the activity feed.
function timeAgo(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

// ISO -> value for <input type="datetime-local"> (local wall-clock, minutes).
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EXAMPLE = {
  subjectType: 'route', slug: 'malaga-ibiza', origin: 'Málaga', destination: 'Ibiza',
  price: '39 €', directFlight: true, city: 'Ibiza', country: 'Spanien', title: '', excerpt: '',
  searchVolume: '82', position: '18', ctr: 'low', competition: 'medium', priceDrop: 'yes', seasonality: 'high',
};

const EMPTY = {
  subjectType: 'route', slug: '', origin: '', destination: '',
  price: '', directFlight: false, city: '', country: '', title: '', excerpt: '',
  searchVolume: '', position: '', ctr: '', competition: '', priceDrop: '', seasonality: '',
};

function lbl(text) {
  return { display: 'block', fontSize: 11.5, color: C.tx2, marginBottom: 4, marginTop: 10 };
}
const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
  background: C.bg2, color: C.tx, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 };
const btn = (bg, fg) => ({ padding: '8px 14px', borderRadius: 9, border: 'none', background: bg, color: fg, fontSize: 13, fontWeight: 700, cursor: 'pointer' });

export default function ContentStudioClient() {
  const [s, setS] = useState(EMPTY);
  const [platform, setPlatform] = useState('instagram');
  const [lang, setLang] = useState('de');
  const [type, setType] = useState('flight_deal');
  const [campaign, setCampaign] = useState('');
  const [copied, setCopied] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueNote, setQueueNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState('');
  const [qPlatform, setQPlatform] = useState('');
  const [qCampaign, setQCampaign] = useState('');
  const [sel, setSel] = useState({});
  const [bulkPlatforms, setBulkPlatforms] = useState([]);
  const [bulkLangs, setBulkLangs] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: '', body: '' });
  const [versionsFor, setVersionsFor] = useState(null);
  const [versions, setVersions] = useState([]);
  const [imageFor, setImageFor] = useState(null);

  const selectedIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel]);
  const campaigns = useMemo(
    () => Array.from(new Set(queue.map((p) => p.campaign).filter(Boolean))).sort(),
    [queue],
  );
  const filteredQueue = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return queue.filter((p) =>
      (!qStatus || p.status === qStatus)
      && (!qPlatform || p.platform === qPlatform)
      && (!qCampaign || p.campaign === qCampaign)
      && (!q || `${p.title || ''} ${p.body || ''} ${p.subject_ref || ''}`.toLowerCase().indexOf(q) !== -1));
  }, [queue, qSearch, qStatus, qPlatform, qCampaign]);
  const [opps, setOpps] = useState([]);
  const [oppNote, setOppNote] = useState('جارٍ التحميل…');
  const [activity, setActivity] = useState([]);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    fetch('/admin/api/content-opportunities')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setOpps(d.opportunities || []); setOppNote((d.opportunities || []).length ? '' : 'لا فرص حالياً — تحقّق لاحقاً.'); }
        else setOppNote(d.error || 'تعذّر تحميل الفرص.');
      })
      .catch(() => setOppNote('تعذّر تحميل الفرص.'));
  }, []);

  const rankedOpps = useMemo(() => rankOpportunities(
    opps.map((o) => ({ inputs: oppInputs(o), subject: { type: 'route', slug: o.slug }, row: o })),
  ).slice(0, 12), [opps]);

  const oppBySlug = useMemo(() => {
    const m = new Map();
    opps.forEach((o) => { if (o.slug) m.set(o.slug, o); });
    return m;
  }, [opps]);

  const [autoCfg, setAutoCfg] = useState({ frequency: 'off', platforms: ['instagram'], languages: ['de'], dailyCount: 3 });
  const [autoMsg, setAutoMsg] = useState('');
  const [autoBusy, setAutoBusy] = useState(false);

  useEffect(() => {
    fetch('/admin/api/social-auto-generate/config')
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.config) setAutoCfg(d.config); })
      .catch(() => {});
  }, []);

  const loadQueue = useCallback(() => {
    fetch('/admin/api/social-posts')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setQueue(d.posts || []);
        setQueueNote(d.unconfigured || (d.ok ? '' : d.error || ''));
      })
      .catch(() => setQueueNote('تعذّر تحميل الطابور.'));
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const loadActivity = useCallback(() => {
    fetch('/admin/api/social-activity')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setActivity(d.activity || []); })
      .catch(() => {});
  }, []);

  // Load the feed the first time the operator opens it.
  useEffect(() => { if (showActivity) loadActivity(); }, [showActivity, loadActivity]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setS((prev) => ({ ...prev, [k]: v }));
  };

  const subject = useMemo(() => ({ type: s.subjectType, slug: s.slug }), [s.subjectType, s.slug]);

  const opportunity = useMemo(() => scoreOpportunity({
    searchVolume: s.searchVolume === '' ? null : Number(s.searchVolume),
    position: s.position === '' ? null : Number(s.position),
    ctr: s.ctr || null,
    competition: s.competition || null,
    priceDrop: s.priceDrop === '' ? null : s.priceDrop,
    seasonality: s.seasonality || null,
  }, subject), [s.searchVolume, s.position, s.ctr, s.competition, s.priceDrop, s.seasonality, subject]);

  const data = useMemo(() => {
    if (type === 'city_guide') return { city: s.city, country: s.country, entities: [s.city, s.country].filter(Boolean) };
    if (type === 'blog_promo') return { title: s.title, excerpt: s.excerpt, entities: [] };
    return { origin: s.origin, destination: s.destination, price: s.price, directFlight: s.directFlight, entities: [s.origin, s.destination].filter(Boolean) };
  }, [type, s]);

  const post = useMemo(() => generateSocialPost({ type, platform, lang, subject, data }), [type, platform, lang, subject, data]);
  const card = useMemo(() => buildImageCard({ type, platform, lang, data }), [type, platform, lang, data]);

  const copy = useCallback((key, text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 1500);
    }).catch(() => {});
  }, []);

  const persist = useCallback((g, subj) => fetch('/admin/api/social-posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: g.platform, language: g.language, template_type: g.type,
      subject_type: subj.type, subject_ref: subj.slug,
      title: g.title, body: g.body, hashtags: g.hashtags,
      cta_label: g.ctaLabel, cta_url: g.ctaUrl, image_brief: g.imageBrief, status: 'draft',
      campaign: campaign.trim() || null,
    }),
  }).then((r) => r.json()), [campaign]);

  const saveToQueue = useCallback(() => {
    setSaving(true);
    persist(post, subject)
      .then((d) => { if (d.ok && d.post) setQueue((q) => [d.post, ...q]); else setQueueNote(d.error || 'تعذّر الحفظ.'); })
      .catch(() => setQueueNote('تعذّر الحفظ.'))
      .finally(() => setSaving(false));
  }, [post, subject, persist]);

  // Generate the current subject/type across every selected platform × language
  // and queue them all. Empty selections fall back to the single current pick,
  // so the button always does something sensible.
  const bulkGenerate = useCallback(() => {
    const plats = bulkPlatforms.length ? bulkPlatforms : [platform];
    const langs = bulkLangs.length ? bulkLangs : [lang];
    const combos = [];
    for (const pf of plats) for (const lg of langs) combos.push([pf, lg]);
    if (!combos.length) return;
    setBulkBusy(true); setBulkMsg('');
    Promise.all(combos.map(([pf, lg]) => {
      const g = generateSocialPost({ type, platform: pf, lang: lg, subject, data });
      return persist(g, subject).then((d) => (d && d.ok && d.post ? d.post : null)).catch(() => null);
    })).then((results) => {
      const saved = results.filter(Boolean);
      if (saved.length) setQueue((q) => [...saved, ...q]);
      const failed = combos.length - saved.length;
      setBulkMsg(`تم توليد وحفظ ${saved.length} منشور${failed ? ` (فشل ${failed})` : ''} ✓`);
    }).finally(() => setBulkBusy(false));
  }, [bulkPlatforms, bulkLangs, platform, lang, type, subject, data, persist]);

  // Fill the generator from a recommended route (real price included).
  const loadOpportunity = useCallback((o) => {
    setType('flight_deal');
    setS((prev) => ({
      ...prev, subjectType: 'route', slug: o.slug,
      origin: o.origin_city || '', destination: o.destination_city || '',
      price: fmtPrice(o.recent_price != null ? o.recent_price : o.price_min, o.price_currency),
      directFlight: !!o.direct_flight_available,
    }));
    if (typeof window !== 'undefined') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, []);

  // Generate a flight-deal post for the current platform/language and queue it.
  const generateAndSave = useCallback((o) => {
    const g = generateSocialPost({
      type: 'flight_deal', platform, lang,
      subject: { type: 'route', slug: o.slug },
      data: {
        origin: o.origin_city, destination: o.destination_city,
        price: fmtPrice(o.recent_price != null ? o.recent_price : o.price_min, o.price_currency),
        directFlight: !!o.direct_flight_available,
        entities: [o.origin_city, o.destination_city].filter(Boolean),
      },
    });
    persist(g, { type: 'route', slug: o.slug })
      .then((d) => { if (d.ok && d.post) setQueue((q) => [d.post, ...q]); else setQueueNote(d.error || 'تعذّر الحفظ.'); })
      .catch(() => setQueueNote('تعذّر الحفظ.'));
  }, [platform, lang, persist]);

  // ── Smart recommendations ── operational "next best actions" derived from the
  // ranked opportunities, the queue, the schedule, and the automation targets.
  const recommendations = useMemo(() => buildRecommendations({
    opportunities: rankedOpps.map((it) => ({
      slug: it.input.row.slug,
      stars: it.stars,
      label: `${it.input.row.origin_city || ''} → ${it.input.row.destination_city || ''}`.trim(),
    })),
    queue,
    config: { platforms: autoCfg.platforms, languages: autoCfg.languages },
  }), [rankedOpps, queue, autoCfg.platforms, autoCfg.languages]);

  const scrollToBottom = useCallback(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, []);
  const scrollToQueue = useCallback(() => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('social-queue');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Turn a recommendation's action into a concrete UI move (filter the queue,
  // preselect bulk targets, or generate posts for the uncovered opportunities).
  const applyRecAction = useCallback((action) => {
    if (!action) return;
    if (action.kind === 'filter_status') { setQStatus(action.status); scrollToQueue(); }
    else if (action.kind === 'platforms') { setBulkPlatforms(action.platforms.filter((p) => PLATFORM_KEYS.includes(p))); scrollToBottom(); }
    else if (action.kind === 'languages') { setBulkLangs(action.languages.filter((l) => LANGUAGES.includes(l))); scrollToBottom(); }
    else if (action.kind === 'generate_opportunities') {
      (action.slugs || []).map((s) => oppBySlug.get(s)).filter(Boolean).forEach(generateAndSave);
      scrollToQueue();
    }
  }, [oppBySlug, generateAndSave, scrollToQueue, scrollToBottom]);

  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const saveAuto = useCallback(() => {
    setAutoBusy(true); setAutoMsg('');
    fetch('/admin/api/social-auto-generate/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(autoCfg) })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.config) { setAutoCfg(d.config); setAutoMsg('تم الحفظ ✓'); } else setAutoMsg(d.error || 'تعذّر الحفظ.'); })
      .catch(() => setAutoMsg('تعذّر الحفظ.'))
      .finally(() => setAutoBusy(false));
  }, [autoCfg]);
  const runAuto = useCallback(() => {
    setAutoBusy(true); setAutoMsg('');
    fetch('/admin/api/social-auto-generate/run', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setAutoMsg(`تم توليد ${d.created} منشور ✓`); loadQueue(); } else setAutoMsg(d.error || 'فشل التوليد.'); })
      .catch(() => setAutoMsg('فشل التوليد.'))
      .finally(() => setAutoBusy(false));
  }, [loadQueue]);

  const patchPost = useCallback((id, patch) => {
    fetch(`/admin/api/social-posts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.post) setQueue((q) => q.map((p) => (p.id === id ? d.post : p))); })
      .catch(() => {});
  }, []);

  const deletePost = useCallback((id) => {
    fetch(`/admin/api/social-posts/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setQueue((q) => q.filter((p) => p.id !== id)); })
      .catch(() => {});
  }, []);

  const startEdit = useCallback((p) => {
    setEditId(p.id);
    setEditDraft({ title: p.title || '', body: p.body || '' });
  }, []);

  const saveEdit = useCallback((id) => {
    if (!editDraft.body.trim()) return;
    patchPost(id, { title: editDraft.title, body: editDraft.body });
    setEditId(null);
  }, [editDraft, patchPost]);

  const loadVersions = useCallback((id) => {
    setVersionsFor(id); setVersions([]);
    fetch(`/admin/api/social-posts/${id}/versions`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setVersions(d.versions || []); })
      .catch(() => {});
  }, []);

  const revertTo = useCallback((postId, versionId) => {
    fetch(`/admin/api/social-posts/${postId}/revert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version_id: versionId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.post) { setQueue((q) => q.map((p) => (p.id === postId ? d.post : p))); loadVersions(postId); } })
      .catch(() => {});
  }, [loadVersions]);

  const bulkStatus = useCallback((status) => {
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length) return;
    Promise.all(ids.map((id) => fetch(`/admin/api/social-posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then((r) => r.json()).catch(() => null)))
      .then(() => { loadQueue(); setSel({}); });
  }, [sel, loadQueue]);

  const bulkDelete = useCallback(() => {
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length) return;
    Promise.all(ids.map((id) => fetch(`/admin/api/social-posts/${id}`, { method: 'DELETE' }).then((r) => r.json()).catch(() => null)))
      .then(() => { setQueue((q) => q.filter((p) => !sel[p.id])); setSel({}); });
  }, [sel]);

  const stars = '★'.repeat(opportunity.stars) + '☆'.repeat(5 - opportunity.stars);
  const starColor = opportunity.stars >= 4 ? C.teal : opportunity.stars === 3 ? C.yellow : C.tx3;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0, color: C.tx }}>استوديو المحتوى</h1>
          <p style={{ fontSize: 13, color: C.tx2, margin: '4px 0 0' }}>قيّم فرصة المحتوى لأي مسار ثم ولّد منشورات جاهزة لكل منصة ولغة — من بياناتك الحقيقية.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn(C.bg3, C.tx)} onClick={() => setS(EXAMPLE)}>مثال: Málaga → Ibiza</button>
          <button style={btn(C.bg3, C.tx2)} onClick={() => setS(EMPTY)}>تفريغ</button>
        </div>
      </div>

      {/* ── Recommended Today ── */}
      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>🔥 مُوصى اليوم</h2>
          <span style={{ fontSize: 12, color: C.tx3 }}>مسارات بهبوط سعر حقيقي أو شعبية عالية — بيانات مباشرة</span>
        </div>
        {oppNote && <p style={{ fontSize: 12.5, color: C.tx3, margin: 0 }}>{oppNote}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {rankedOpps.map((it) => {
            const o = it.input.row;
            const drop = Number(o.price_drop_pct) > 0;
            return (
              <div key={o.slug} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, background: C.bg2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 13.5, color: C.tx }}>{o.origin_city} → {o.destination_city}</strong>
                  <span style={{ fontSize: 15, letterSpacing: 1, color: it.stars >= 4 ? C.teal : it.stars === 3 ? C.yellow : C.tx3 }}>{'★'.repeat(it.stars)}{'☆'.repeat(5 - it.stars)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                  {drop && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.teal, background: C.tealGlow, padding: '2px 8px', borderRadius: 6 }}>▼ {o.price_drop_pct}% · {fmtPrice(o.recent_price, o.price_currency)}</span>}
                  {o.route_score != null && <span style={{ fontSize: 11, color: C.tx2 }}>شعبية {Math.round(Number(o.route_score))}</span>}
                  {o.airline_count != null && <span style={{ fontSize: 11, color: C.tx2 }}>{o.airline_count} شركة</span>}
                </div>
                {it.reasons[0] && <p style={{ fontSize: 11.5, color: C.tx2, margin: '0 0 10px', lineHeight: 1.5 }}>{it.reasons[0]}</p>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...btn(C.teal, '#04121b'), padding: '5px 10px', fontSize: 12 }} onClick={() => generateAndSave(o)}>توليد وحفظ</button>
                  <button style={{ ...btn(C.bg3, C.tx), padding: '5px 10px', fontSize: 12 }} onClick={() => loadOpportunity(o)}>تحميل</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Smart recommendations ── */}
      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>💡 توصيات ذكية</h2>
          <span style={{ fontSize: 12, color: C.tx3 }}>خطواتك التالية — من طابورك وجدولك وفرصك (بيانات حقيقية)</span>
        </div>
        {recommendations.length === 0 ? (
          <p style={{ fontSize: 13, color: C.teal, margin: 0 }}>✓ كل شيء على ما يرام — لا توصيات عاجلة حالياً.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {recommendations.map((r) => {
              const col = C[REC_SEVERITY[r.severity]] || C.tx2;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: C.bg2, border: `1px solid ${C.border}`, borderInlineStart: `3px solid ${col}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.tx }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: C.tx2, marginTop: 3, lineHeight: 1.6 }}>{r.detail}</div>
                  </div>
                  {r.action && (
                    <button style={{ ...btn(C.bg3, C.tx), padding: '5px 12px', fontSize: 12, flexShrink: 0, alignSelf: 'center' }} onClick={() => applyRecAction(r.action)}>
                      {r.action.kind === 'generate_opportunities' ? 'توليد' : r.action.kind === 'filter_status' ? 'عرض' : 'تجهيز'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Daily automation ── */}
      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>⚙️ التوليد التلقائي</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['off', 'إيقاف'], ['daily', 'يومي'], ['weekly', 'أسبوعي']].map(([v, label]) => (
              <button key={v} onClick={() => setAutoCfg((c) => ({ ...c, frequency: v }))}
                style={{ ...btn(autoCfg.frequency === v ? C.teal : C.bg3, autoCfg.frequency === v ? '#04121b' : C.tx2), padding: '5px 12px', fontSize: 12.5 }}>{label}</button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.tx3, margin: '0 0 12px' }}>اختر «يومي» أو «أسبوعي» ليولّد النظام مسودات تلقائياً من أفضل الفرص (هبوط السعر/الشعبية) إلى الطابور — دون فتح اللوحة. «إيقاف» يوقف التوليد التلقائي (يبقى «شغّل الآن» يدوياً).</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.tx2, marginBottom: 5 }}>المنصات</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {PLATFORM_KEYS.map((p) => (
                <button key={p} onClick={() => setAutoCfg((c) => ({ ...c, platforms: toggleIn(c.platforms, p) }))}
                  style={{ ...btn(autoCfg.platforms.includes(p) ? C.teal : C.bg3, autoCfg.platforms.includes(p) ? '#04121b' : C.tx2), padding: '4px 9px', fontSize: 11.5 }}>{PLATFORMS[p].label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.tx2, marginBottom: 5 }}>اللغة (الأولى تُستخدم)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {LANGUAGES.map((l) => (
                <button key={l} onClick={() => setAutoCfg((c) => ({ ...c, languages: toggleIn(c.languages, l) }))}
                  style={{ ...btn(autoCfg.languages.includes(l) ? C.teal : C.bg3, autoCfg.languages.includes(l) ? '#04121b' : C.tx2), padding: '4px 9px', fontSize: 11.5 }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.tx2, marginBottom: 5 }}>عدد الفرص يومياً</div>
            <input type="number" min="1" max="20" value={autoCfg.dailyCount} onChange={(e) => setAutoCfg((c) => ({ ...c, dailyCount: Number(e.target.value) || 1 }))} style={{ ...inputStyle, width: 80 }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button style={btn(C.teal, '#04121b')} onClick={saveAuto} disabled={autoBusy}>حفظ الإعدادات</button>
          <button style={btn(C.bg3, C.tx)} onClick={runAuto} disabled={autoBusy}>▶ شغّل الآن</button>
          {autoMsg && <span style={{ fontSize: 12.5, color: C.tx2 }}>{autoMsg}</span>}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, alignItems: 'start' }}>

        {/* ── Opportunity ── */}
        <section style={cardStyle}>
          <h2 style={{ fontSize: 15, margin: '0 0 4px', color: C.tx }}>فرصة المحتوى</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl()}>المسار (slug)</label>
              <input style={inputStyle} value={s.slug} onChange={set('slug')} placeholder="malaga-ibiza" />
            </div>
            <div>
              <label style={lbl()}>حجم البحث (Search Console)</label>
              <input style={inputStyle} value={s.searchVolume} onChange={set('searchVolume')} inputMode="numeric" placeholder="82" />
            </div>
            <div>
              <label style={lbl()}>الترتيب الحالي</label>
              <input style={inputStyle} value={s.position} onChange={set('position')} inputMode="numeric" placeholder="18" />
            </div>
            <div>
              <label style={lbl()}>CTR</label>
              <select style={inputStyle} value={s.ctr} onChange={set('ctr')}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select>
            </div>
            <div>
              <label style={lbl()}>المنافسة</label>
              <select style={inputStyle} value={s.competition} onChange={set('competition')}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select>
            </div>
            <div>
              <label style={lbl()}>الموسمية</label>
              <select style={inputStyle} value={s.seasonality} onChange={set('seasonality')}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select>
            </div>
            <div>
              <label style={lbl()}>هبوط سعر؟</label>
              <select style={inputStyle} value={s.priceDrop} onChange={set('priceDrop')}>
                <option value="">—</option><option value="yes">نعم</option><option value="no">لا</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: C.bg2, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 26, letterSpacing: 2, color: starColor }}>{stars}</span>
              <span style={{ fontSize: 13, color: C.tx2 }}>الدرجة: <strong style={{ color: C.tx }}>{opportunity.score}</strong>/100</span>
            </div>
            <p style={{ fontSize: 13, color: C.tx, margin: '10px 0 6px', fontWeight: 700 }}>{opportunity.recommendation}</p>
            {opportunity.reasons.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, color: C.tx2, fontSize: 12.5, lineHeight: 1.7 }}>
                {opportunity.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {opportunity.missing.length > 0 && (
              <p style={{ fontSize: 11.5, color: C.yellow, margin: '10px 0 0' }}>إشارات غير متصلة بعد: {opportunity.missing.join('، ')} — اربط Google Search Console لدرجة كاملة.</p>
            )}
            <button style={{ ...btn(C.teal, '#04121b'), marginTop: 12 }} onClick={() => setType(opportunity.suggestedTemplate)}>
              توليد محتوى ({TYPE_LABEL[opportunity.suggestedTemplate]}) ↓
            </button>
          </div>
        </section>

        {/* ── Generator ── */}
        <section style={cardStyle}>
          <h2 style={{ fontSize: 15, margin: '0 0 4px', color: C.tx }}>مولّد المنشورات</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl()}>النوع</label>
              <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>{TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
            </div>
            <div>
              <label style={lbl()}>المنصة</label>
              <select style={inputStyle} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORM_KEYS.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}</select>
            </div>
            <div>
              <label style={lbl()}>اللغة</label>
              <select style={inputStyle} value={lang} onChange={(e) => setLang(e.target.value)}>{LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
            </div>
          </div>

          <div>
            <label style={lbl()}>الحملة (اختياري — لتجميع المنشورات وفلترتها)</label>
            <input style={inputStyle} value={campaign} onChange={(e) => setCampaign(e.target.value)} list="campaign-list" placeholder="مثال: صيف مالقة 2026" maxLength={120} />
            {campaigns.length > 0 && <datalist id="campaign-list">{campaigns.map((c) => <option key={c} value={c} />)}</datalist>}
          </div>

          {type === 'flight_deal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl()}>من</label><input style={inputStyle} value={s.origin} onChange={set('origin')} placeholder="Málaga" /></div>
              <div><label style={lbl()}>إلى</label><input style={inputStyle} value={s.destination} onChange={set('destination')} placeholder="Ibiza" /></div>
              <div><label style={lbl()}>السعر (اختياري — حقيقي فقط)</label><input style={inputStyle} value={s.price} onChange={set('price')} placeholder="39 €" /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'end', paddingBottom: 8, fontSize: 13, color: C.tx2 }}>
                <input type="checkbox" checked={s.directFlight} onChange={set('directFlight')} /> رحلة مباشرة
              </label>
            </div>
          )}
          {type === 'city_guide' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl()}>المدينة</label><input style={inputStyle} value={s.city} onChange={set('city')} placeholder="Ibiza" /></div>
              <div><label style={lbl()}>الدولة (اختياري)</label><input style={inputStyle} value={s.country} onChange={set('country')} placeholder="Spanien" /></div>
            </div>
          )}
          {type === 'blog_promo' && (
            <div>
              <div><label style={lbl()}>عنوان المقال</label><input style={inputStyle} value={s.title} onChange={set('title')} /></div>
              <div><label style={lbl()}>المقتطف (اختياري)</label><input style={inputStyle} value={s.excerpt} onChange={set('excerpt')} /></div>
            </div>
          )}

          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: C.bg2, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: post.withinLimit ? C.tx2 : C.red }}>{post.charCount} / {PLATFORMS[platform].maxLen} حرف {post.withinLimit ? '' : '⚠ تجاوز'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(C.bg3, C.tx)} onClick={saveToQueue} disabled={saving}>{saving ? '…' : 'حفظ في الطابور'}</button>
                <button style={btn(C.teal, '#04121b')} onClick={() => copy('body', post.body)}>{copied === 'body' ? 'تم النسخ ✓' : 'نسخ المنشور'}</button>
              </div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: 13.5, color: C.tx, lineHeight: 1.7 }}>{post.body}</pre>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {post.hashtags.map((h) => <span key={h} style={{ fontSize: 12, color: C.teal, background: C.tealGlow, padding: '2px 8px', borderRadius: 6 }}>{h}</span>)}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: C.tx2 }}>
              <div style={{ marginBottom: 6 }}><strong style={{ color: C.tx3 }}>رابط CTA (UTM):</strong> <span style={{ color: C.blue, wordBreak: 'break-all' }}>{post.ctaUrl}</span>
                <button style={{ ...btn(C.bg3, C.tx2), marginInlineStart: 8, padding: '3px 8px', fontSize: 11 }} onClick={() => copy('cta', post.ctaUrl)}>{copied === 'cta' ? '✓' : 'نسخ'}</button></div>
              <div><strong style={{ color: C.tx3 }}>وصف الصورة المقترح:</strong> {post.imageBrief}</div>
            </div>
          </div>

          {/* ── Branded image card ── */}
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: C.bg2, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong style={{ fontSize: 13, color: C.tx }}>صورة جاهزة للنشر</strong>
              <span style={{ fontSize: 11.5, color: C.tx3 }}>{PLATFORMS[platform].label} · {card.width}×{card.height}px · SVG</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.dataUri}
              alt={`صورة ${card.headline}`}
              style={{ display: 'block', width: '100%', maxWidth: 420, margin: '0 auto', borderRadius: 10, border: `1px solid ${C.border}` }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={btn(C.teal, '#04121b')} onClick={() => downloadCardPng(card, () => setQueueNote('تعذّر إنشاء PNG — جرّب تنزيل SVG.'))}>⬇ تنزيل PNG</button>
              <button style={btn(C.bg3, C.tx)} onClick={() => downloadCardSvg(card)}>⬇ تنزيل SVG</button>
            </div>
            <p style={{ fontSize: 11, color: C.tx3, margin: '10px 0 0', textAlign: 'center' }}>تُولّد محلياً من بياناتك — بدون خدمات خارجية. السعر يظهر فقط عند إدخاله (لا اختلاق).</p>
          </div>

          {/* ── Bulk generate ── */}
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: C.bg2, border: `1px dashed ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong style={{ fontSize: 13, color: C.tx }}>توليد جماعي</strong>
              <span style={{ fontSize: 11.5, color: C.tx3 }}>نفس الموضوع لعدة منصات ولغات دفعة واحدة</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: C.tx2, marginBottom: 5 }}>المنصات {bulkPlatforms.length ? `(${bulkPlatforms.length})` : '(الحالية)'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {PLATFORM_KEYS.map((p) => (
                  <button key={p} onClick={() => setBulkPlatforms((a) => toggleIn(a, p))}
                    style={{ ...btn(bulkPlatforms.includes(p) ? C.teal : C.bg3, bulkPlatforms.includes(p) ? '#04121b' : C.tx2), padding: '4px 9px', fontSize: 11.5 }}>{PLATFORMS[p].label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: C.tx2, marginBottom: 5 }}>اللغات {bulkLangs.length ? `(${bulkLangs.length})` : '(الحالية)'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {LANGUAGES.map((l) => (
                  <button key={l} onClick={() => setBulkLangs((a) => toggleIn(a, l))}
                    style={{ ...btn(bulkLangs.includes(l) ? C.teal : C.bg3, bulkLangs.includes(l) ? '#04121b' : C.tx2), padding: '4px 9px', fontSize: 11.5 }}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button style={btn(C.teal, '#04121b')} onClick={bulkGenerate} disabled={bulkBusy}>{bulkBusy ? '…' : `توليد وحفظ للكل (${(bulkPlatforms.length || 1) * (bulkLangs.length || 1)})`}</button>
              {bulkMsg && <span style={{ fontSize: 12.5, color: C.tx2 }}>{bulkMsg}</span>}
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: C.tx3, marginTop: 10 }}>💡 النشر التلقائي للمنصات وربط Search Console للدرجة الحيّة — الخطوات التالية.</p>
        </section>
      </div>

      {/* ── Queue ── */}
      <section id="social-queue" style={{ ...cardStyle, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>الطابور ({filteredQueue.length}{filteredQueue.length !== queue.length ? ` / ${queue.length}` : ''})</h2>
          <button style={btn(C.bg3, C.tx2)} onClick={loadQueue}>تحديث</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <input value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder="بحث في النص/المسار…" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">كل الحالات</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select value={qPlatform} onChange={(e) => setQPlatform(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">كل المنصات</option>
            {PLATFORM_KEYS.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
          </select>
          {campaigns.length > 0 && (
            <select value={qCampaign} onChange={(e) => setQCampaign(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">كل الحملات</option>
              {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: C.bg3 }}>
            <span style={{ fontSize: 12.5, color: C.tx }}>{selectedIds.length} محدّد</span>
            <button style={{ ...btn(C.teal, '#04121b'), padding: '4px 10px', fontSize: 12 }} onClick={() => bulkStatus('approved')}>اعتماد</button>
            <button style={{ ...btn(C.bg2, C.tx), padding: '4px 10px', fontSize: 12 }} onClick={() => bulkStatus('draft')}>مسودة</button>
            <button style={{ ...btn(C.redBg, C.red), padding: '4px 10px', fontSize: 12 }} onClick={bulkDelete}>حذف</button>
            <button style={{ ...btn(C.bg2, C.tx2), padding: '4px 10px', fontSize: 12 }} onClick={() => setSel({})}>إلغاء التحديد</button>
          </div>
        )}

        {queueNote && <p style={{ fontSize: 12, color: C.yellow, margin: '0 0 10px' }}>{queueNote}</p>}
        {filteredQueue.length === 0 && !queueNote && <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>{queue.length ? 'لا نتائج مطابقة.' : 'لا منشورات محفوظة بعد — ولّد منشوراً واضغط «حفظ في الطابور».'}</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredQueue.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${sel[p.id] ? C.teal : C.border}`, borderRadius: 10, padding: 12, background: C.bg2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.tx2 }}>
                <input type="checkbox" checked={!!sel[p.id]} onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.checked }))} />
                <span style={{ color: C.teal, fontWeight: 700 }}>{(PLATFORMS[p.platform] && PLATFORMS[p.platform].label) || p.platform}</span>
                <span>· {String(p.language).toUpperCase()}</span>
                <span>· {TYPE_LABEL[p.template_type] || p.template_type}</span>
                {p.created_by === 'auto' && <span style={{ fontSize: 10.5, color: C.blue, background: C.blueBg, padding: '1px 6px', borderRadius: 5 }}>تلقائي</span>}
                {p.campaign && <span style={{ fontSize: 10.5, color: C.teal, background: C.tealGlow, padding: '1px 6px', borderRadius: 5 }}>🏷 {p.campaign}</span>}
                <span style={{ marginInlineStart: 'auto' }}>
                  <select value={p.status} onChange={(e) => patchPost(p.id, { status: e.target.value })} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                    {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                  </select>
                </span>
              </div>
              {editId === p.id ? (
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  <input value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} placeholder="العنوان (اختياري)" style={{ ...inputStyle, fontSize: 12.5 }} />
                  <textarea value={editDraft.body} onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))} rows={5} style={{ ...inputStyle, fontSize: 12.5, resize: 'vertical', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...btn(C.teal, '#04121b'), padding: '4px 12px', fontSize: 12 }} onClick={() => saveEdit(p.id)} disabled={!editDraft.body.trim()}>حفظ</button>
                    <button style={{ ...btn(C.bg3, C.tx2), padding: '4px 12px', fontSize: 12 }} onClick={() => setEditId(null)}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0', fontFamily: 'inherit', fontSize: 12.5, color: C.tx, maxHeight: 88, overflow: 'hidden' }}>{p.body}</pre>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 11.5, color: C.tx3 }}>جدولة:
                  <input
                    type="datetime-local"
                    value={toLocalInput(p.scheduled_at)}
                    onChange={(e) => patchPost(p.id, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null, status: e.target.value ? 'scheduled' : p.status })}
                    style={{ ...inputStyle, width: 'auto', marginInlineStart: 6, padding: '4px 8px', fontSize: 12 }}
                  />
                </label>
                <button style={{ ...btn(C.bg3, C.tx), padding: '4px 10px', fontSize: 12 }} onClick={() => (editId === p.id ? setEditId(null) : startEdit(p))}>{editId === p.id ? 'إغلاق' : 'تعديل'}</button>
                <button style={{ ...btn(C.bg3, C.tx2), padding: '4px 10px', fontSize: 12 }} onClick={() => (versionsFor === p.id ? setVersionsFor(null) : loadVersions(p.id))}>{versionsFor === p.id ? 'إخفاء النسخ' : 'النسخ السابقة'}</button>
                <button style={{ ...btn(C.bg3, C.tx2), padding: '4px 10px', fontSize: 12 }} onClick={() => setImageFor((v) => (v === p.id ? null : p.id))}>{imageFor === p.id ? 'إخفاء الصورة' : '🖼 صورة'}</button>
                <button style={{ ...btn(C.bg3, C.tx2), padding: '4px 10px', fontSize: 12 }} onClick={() => copy('q' + p.id, p.body)}>{copied === 'q' + p.id ? '✓' : 'نسخ'}</button>
                <button style={{ ...btn(C.redBg, C.red), padding: '4px 10px', fontSize: 12 }} onClick={() => deletePost(p.id)}>حذف</button>
              </div>
              {versionsFor === p.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'grid', gap: 6 }}>
                  {versions.length === 0 && <p style={{ fontSize: 12, color: C.tx3, margin: 0 }}>لا نسخ سابقة — تظهر النسخ بعد أول تعديل.</p>}
                  {versions.map((v) => (
                    <div key={v.id} style={{ background: C.bg3, borderRadius: 8, padding: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: C.tx3, marginBottom: 4 }}>
                        <span>{timeAgo(v.created_at)}</span>
                        <span>· {v.editor === 'auto' ? 'تلقائي' : (v.editor || 'admin')}</span>
                        <button style={{ ...btn(C.teal, '#04121b'), padding: '2px 8px', fontSize: 11, marginInlineStart: 'auto' }} onClick={() => revertTo(p.id, v.id)}>استرجاع</button>
                      </div>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: 11.5, color: C.tx2, maxHeight: 60, overflow: 'hidden' }}>{v.body}</pre>
                    </div>
                  ))}
                </div>
              )}
              {imageFor === p.id && (() => {
                const qCard = buildImageCard(postToCardOpts(p));
                return (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'grid', gap: 8, justifyItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.tx3, alignSelf: 'start' }}>{(PLATFORMS[p.platform] && PLATFORMS[p.platform].label) || p.platform} · {qCard.width}×{qCard.height}px</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qCard.dataUri} alt={`صورة ${qCard.headline}`} style={{ display: 'block', width: '100%', maxWidth: 320, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...btn(C.teal, '#04121b'), padding: '4px 12px', fontSize: 12 }} onClick={() => downloadCardPng(qCard)}>⬇ PNG</button>
                      <button style={{ ...btn(C.bg3, C.tx), padding: '4px 12px', fontSize: 12 }} onClick={() => downloadCardSvg(qCard)}>⬇ SVG</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      {/* ── Activity log ── */}
      <section style={{ ...cardStyle, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>سجلّ النشاط</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {showActivity && <button style={btn(C.bg3, C.tx2)} onClick={loadActivity}>تحديث</button>}
            <button style={btn(C.bg3, C.tx)} onClick={() => setShowActivity((v) => !v)}>{showActivity ? 'إخفاء' : 'عرض'}</button>
          </div>
        </div>
        {showActivity && (
          <div style={{ marginTop: 12 }}>
            {activity.length === 0 && <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>لا نشاط مُسجّل بعد.</p>}
            <div style={{ display: 'grid', gap: 6 }}>
              {activity.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: C.tx2, padding: '6px 10px', borderRadius: 8, background: C.bg2, border: `1px solid ${C.border}` }}>
                  <span style={{ color: a.action === 'deleted' ? C.red : C.teal, fontWeight: 700 }}>{ACTION_LABEL[a.action] || a.action}</span>
                  {a.action === 'auto_generated' && a.detail && a.detail.count != null && <span>× {a.detail.count}</span>}
                  {a.subject_ref && <span style={{ color: C.tx }}>{a.subject_ref}</span>}
                  {a.platform && <span>· {(PLATFORMS[a.platform] && PLATFORMS[a.platform].label) || a.platform}</span>}
                  {a.action === 'status_changed' && a.detail && a.detail.status && <span>→ {STATUS_LABEL[a.detail.status] || a.detail.status}</span>}
                  <span style={{ marginInlineStart: 'auto', color: C.tx3 }}>{a.actor === 'auto' ? 'تلقائي' : (a.actor || 'admin')} · {timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
