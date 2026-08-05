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

const { generateSocialPost, PLATFORMS, LANGUAGES, TEMPLATE_TYPES } = generatorMod;
const { scoreOpportunity } = opportunityMod;

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const LEVELS = ['', 'low', 'medium', 'high'];
const TYPE_LABEL = { flight_deal: 'عرض رحلة', city_guide: 'دليل مدينة', blog_promo: 'ترويج مقال' };
const LEVEL_LABEL = { '': '—', low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };
const STATUS_ORDER = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'];
const STATUS_LABEL = { draft: 'مسودة', pending_review: 'بانتظار المراجعة', approved: 'معتمد', scheduled: 'مجدول', published: 'منشور', failed: 'فشل' };

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
  const [copied, setCopied] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueNote, setQueueNote] = useState('');
  const [saving, setSaving] = useState(false);

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

  const copy = useCallback((key, text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 1500);
    }).catch(() => {});
  }, []);

  const saveToQueue = useCallback(() => {
    setSaving(true);
    fetch('/admin/api/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: post.platform, language: post.language, template_type: post.type,
        subject_type: subject.type, subject_ref: subject.slug,
        title: post.title, body: post.body, hashtags: post.hashtags,
        cta_label: post.ctaLabel, cta_url: post.ctaUrl, image_brief: post.imageBrief,
        status: 'draft',
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.post) setQueue((q) => [d.post, ...q]);
        else setQueueNote(d.error || 'تعذّر الحفظ.');
      })
      .catch(() => setQueueNote('تعذّر الحفظ.'))
      .finally(() => setSaving(false));
  }, [post, subject]);

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
          <p style={{ fontSize: 11.5, color: C.tx3, marginTop: 10 }}>💡 النشر التلقائي للمنصات وربط Search Console للدرجة الحيّة — الخطوات التالية.</p>
        </section>
      </div>

      {/* ── Queue ── */}
      <section style={{ ...cardStyle, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: C.tx }}>الطابور ({queue.length})</h2>
          <button style={btn(C.bg3, C.tx2)} onClick={loadQueue}>تحديث</button>
        </div>
        {queueNote && <p style={{ fontSize: 12, color: C.yellow, margin: '0 0 10px' }}>{queueNote}</p>}
        {queue.length === 0 && !queueNote && <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>لا منشورات محفوظة بعد — ولّد منشوراً واضغط «حفظ في الطابور».</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {queue.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, background: C.bg2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.tx2 }}>
                <span style={{ color: C.teal, fontWeight: 700 }}>{(PLATFORMS[p.platform] && PLATFORMS[p.platform].label) || p.platform}</span>
                <span>· {String(p.language).toUpperCase()}</span>
                <span>· {TYPE_LABEL[p.template_type] || p.template_type}</span>
                <span style={{ marginInlineStart: 'auto' }}>
                  <select value={p.status} onChange={(e) => patchPost(p.id, { status: e.target.value })} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                    {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                  </select>
                </span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0', fontFamily: 'inherit', fontSize: 12.5, color: C.tx, maxHeight: 88, overflow: 'hidden' }}>{p.body}</pre>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 11.5, color: C.tx3 }}>جدولة:
                  <input
                    type="datetime-local"
                    value={toLocalInput(p.scheduled_at)}
                    onChange={(e) => patchPost(p.id, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null, status: e.target.value ? 'scheduled' : p.status })}
                    style={{ ...inputStyle, width: 'auto', marginInlineStart: 6, padding: '4px 8px', fontSize: 12 }}
                  />
                </label>
                <button style={{ ...btn(C.bg3, C.tx2), padding: '4px 10px', fontSize: 12 }} onClick={() => copy('q' + p.id, p.body)}>{copied === 'q' + p.id ? '✓' : 'نسخ'}</button>
                <button style={{ ...btn(C.redBg, C.red), padding: '4px 10px', fontSize: 12 }} onClick={() => deletePost(p.id)}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
