'use client';

// [SOCIAL-STUDIO-UI] Interactive Content Studio: score a route/page as a content
// opportunity and generate ready-to-post social copy for every platform and
// language — all client-side on top of the pure, tested lib/social engines. No
// network, no persistence yet (that's the next increment); the operator fills
// the signals today, and GSC / price-history auto-fill and a save-to-queue land
// later. Honest by design: the opportunity score only counts signals that are
// actually provided.
import { useState, useMemo, useCallback } from 'react';
import { ADMIN_COLORS as C } from '../../../../lib/admin/theme';
import generatorMod from '../../../../lib/social/generator';
import opportunityMod from '../../../../lib/social/opportunity';

const { generateSocialPost, PLATFORMS, LANGUAGES, TEMPLATE_TYPES } = generatorMod;
const { scoreOpportunity } = opportunityMod;

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const LEVELS = ['', 'low', 'medium', 'high'];
const TYPE_LABEL = { flight_deal: 'عرض رحلة', city_guide: 'دليل مدينة', blog_promo: 'ترويج مقال' };
const LEVEL_LABEL = { '': '—', low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };

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
              <button style={btn(C.teal, '#04121b')} onClick={() => copy('body', post.body)}>{copied === 'body' ? 'تم النسخ ✓' : 'نسخ المنشور'}</button>
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
          <p style={{ fontSize: 11.5, color: C.tx3, marginTop: 10 }}>💡 الحفظ في طابور/تقويم والنشر التلقائي وربط Search Console — الخطوة التالية (تحتاج جدول Supabase + مسار كتابة).</p>
        </section>
      </div>
    </div>
  );
}
