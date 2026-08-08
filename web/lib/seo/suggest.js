'use strict';

// [Phase 15 + 16] Rule-based (no-AI) SEO optimization SUGGESTIONS with a
// BEFORE / PROPOSED comparison. It proposes a Title / Meta / H1 ONLY when a real
// trigger exists (a CTR opportunity, a missing/oversized element, or a clear
// intent mismatch) — otherwise it returns "No change recommended" (Phase 7/9).
// It is READ-ONLY: nothing here writes to the page or the DB.
//
// Hard guardrails (Phase 7/8/25): proposals use ONLY facts already present on the
// page — city names parsed from the real H1/title, and facet words gated on the
// page's real content flags (a "Direktflüge"/"Preise" facet is added only when
// the page actually exposes direct-flight / price info). No invented prices,
// airlines, flight times, or distances. Brand "| Airpiv" is preserved. Cities
// differ per route, so proposals are never identical across pages.

// Localized intent keyword + facet words. Only 'de' (default/root) and 'en' are
// generated; other languages return a manual-review note rather than a guess.
const LANGPACK = {
  de: {
    intentWord: { duration: 'Flugzeit', direct: 'Direktflüge', price: 'Flugpreise', distance: 'Entfernung', flight: 'Flüge' },
    facet: { direct: 'Direktflüge', price: 'Preise', distance: 'Entfernung' },
    h1: (o, d) => `Flüge von ${o} nach ${d}`,
    metaQuestion: { duration: (o, d) => `Wie lange dauert der Flug von ${o} nach ${d}?`, direct: (o, d) => `Gibt es Direktflüge von ${o} nach ${d}?`, distance: (o, d) => `Wie weit ist ${o} von ${d} entfernt?`, price: (o, d) => `Was kostet ein Flug von ${o} nach ${d}?` },
    metaFacets: { duration: 'Flugzeit', direct: 'Direktflüge', price: 'aktuelle Flugpreise', distance: 'Entfernung' },
    metaTail: (o, d) => `für ${o} → ${d} auf Airpiv.`,
    lead: 'Erfahre',
    contentIntro: (o, d, c, f) => `Du planst einen Flug von ${o} nach ${d}? Hier findest du die wichtigsten Infos zur Strecke${f.distanceKm ? ` – die Entfernung beträgt rund ${f.distanceKm}` : ''}${f.flightTime ? ` und die Flugzeit liegt bei etwa ${f.flightTime}` : ''} übersichtlich zusammengefasst.`,
    faq: {
      duration: { q: (o, d) => `Wie lange dauert der Flug von ${o} nach ${d}?`, a: (o, d, c, f) => (f.flightTime ? `Die Flugzeit von ${o} nach ${d} beträgt etwa ${f.flightTime}.` : `Die aktuelle Flugzeit für ${o} → ${d} findest du im Streckenabschnitt oben auf der Seite.`), supported: () => true },
      direct: { q: (o, d) => `Gibt es Direktflüge von ${o} nach ${d}?`, a: (o, d, c) => (c.hasDirectInfo ? `Für die Strecke ${o} → ${d} sind Direktverbindungen verfügbar – die Details stehen im Abschnitt oben.` : `Ob Direktflüge von ${o} nach ${d} angeboten werden, zeigt dir der Streckenabschnitt oben.`), supported: () => true },
      distance: { q: (o, d) => `Wie weit ist ${o} von ${d} entfernt?`, a: (o, d, c, f) => `Die Entfernung von ${o} nach ${d} beträgt ca. ${f.distanceKm}.`, supported: (c, f) => !!f.distanceKm },
      price: { q: (o, d) => `Was kostet ein Flug von ${o} nach ${d}?`, a: (o, d) => `Aktuelle Flugpreise für ${o} → ${d} vergleichst du live oben auf der Seite.`, supported: () => true },
    },
    contentReason: 'محتوى فريد مبني على أسماء المدن الحقيقية والحقائق المستخرَجة من الصفحة فقط.',
  },
  en: {
    intentWord: { duration: 'Flight Time', direct: 'Direct Flights', price: 'Flight Prices', distance: 'Distance', flight: 'Flights' },
    facet: { direct: 'Direct Flights', price: 'Prices', distance: 'Distance' },
    h1: (o, d) => `Flights from ${o} to ${d}`,
    metaQuestion: { duration: (o, d) => `How long is the flight from ${o} to ${d}?`, direct: (o, d) => `Are there direct flights from ${o} to ${d}?`, distance: (o, d) => `How far is ${o} from ${d}?`, price: (o, d) => `How much is a flight from ${o} to ${d}?` },
    metaFacets: { duration: 'flight time', direct: 'direct flights', price: 'current fares', distance: 'distance' },
    metaTail: (o, d) => `for ${o} → ${d} on Airpiv.`,
    lead: 'See the',
    contentIntro: (o, d, c, f) => `Planning a flight from ${o} to ${d}? Here you'll find the key details for this route${f.distanceKm ? ` – the distance is about ${f.distanceKm}` : ''}${f.flightTime ? ` and the flight time is around ${f.flightTime}` : ''}, all in one place.`,
    faq: {
      duration: { q: (o, d) => `How long is the flight from ${o} to ${d}?`, a: (o, d, c, f) => (f.flightTime ? `The flight from ${o} to ${d} takes about ${f.flightTime}.` : `You'll find the current flight time for ${o} → ${d} in the route section above.`), supported: () => true },
      direct: { q: (o, d) => `Are there direct flights from ${o} to ${d}?`, a: (o, d, c) => (c.hasDirectInfo ? `Direct connections are available for ${o} → ${d} – see the section above for details.` : `Whether direct flights from ${o} to ${d} are offered is shown in the route section above.`), supported: () => true },
      distance: { q: (o, d) => `How far is ${o} from ${d}?`, a: (o, d, c, f) => `The distance from ${o} to ${d} is about ${f.distanceKm}.`, supported: (c, f) => !!f.distanceKm },
      price: { q: (o, d) => `How much is a flight from ${o} to ${d}?`, a: (o, d) => `Compare current fares for ${o} → ${d} live at the top of the page.`, supported: () => true },
    },
    contentReason: 'Unique content built only from the real city names and facts extracted from the page.',
  },
};

// Build a unique, grounded content block (intro + up to 3 FAQ). It states a
// number/name ONLY when it appears in the extracted `facts` — never invented.
function buildContent(pack, o, d, intent, content, facts) {
  const c = content || {};
  const f = facts || {};
  const order = [intent, 'duration', 'direct', 'distance', 'price'].filter((v, i, arr) => arr.indexOf(v) === i && pack.faq[v]);
  const chosen = [];
  for (const k of order) {
    const item = pack.faq[k];
    if (item && item.supported(c, f)) chosen.push(item);
    if (chosen.length >= 3) break;
  }
  const intro = pack.contentIntro(o, d, c, f);
  const faqText = chosen.map((it) => `Q: ${it.q(o, d)}\nA: ${it.a(o, d, c, f)}`).join('\n\n');
  const proposed = `${intro}\n\n${faqText}`.trim();
  const factsUsed = [];
  if (f.distanceKm) factsUsed.push(`distance: ${f.distanceKm}`);
  if (f.flightTime) factsUsed.push(`flight time: ${f.flightTime}`);
  if (Array.isArray(f.airlines) && f.airlines.length) factsUsed.push(`airlines: ${f.airlines.join(', ')}`);
  return { current: null, proposed, changeRecommended: true, reason: pack.contentReason, factsUsed };
}

// Parse the route's real city names from the H1 (preferred) or title. Never
// fabricates — returns null when it can't parse a clean pair, so the caller
// falls back to a manual-review note instead of guessing.
function parseCities(elements, lang) {
  const sources = [elements && elements.h1, elements && elements.title].filter(Boolean);
  const patterns = [
    /von\s+(.+?)\s+nach\s+(.+?)(?:\s*[–|-]|$)/i, // de: "Flüge von X nach Y"
    /from\s+(.+?)\s+to\s+(.+?)(?:\s*[–|-]|$)/i, // en: "Flights from X to Y"
    /^\s*(.+?)\s*(?:→|->|–|-)\s*(.+?)(?:\s*[|]|$)/, // "X → Y" style
  ];
  for (const src of sources) {
    for (const re of patterns) {
      const m = src.match(re);
      if (m && m[1] && m[2]) {
        const origin = m[1].trim();
        const destination = m[2].trim();
        if (origin && destination && origin.length <= 40 && destination.length <= 40) return { origin, destination };
      }
    }
  }
  return null;
}

function ctrOpportunity(gsc) {
  if (!gsc) return false;
  const imp = Number(gsc.impressions);
  const pos = Number(gsc.position);
  if (!(imp >= 20) || !(pos <= 15)) return false;
  const ctr = gsc.clicks == null ? 0 : (Number(gsc.clicks) / imp); // unknown clicks in a Pages export read as ~0
  return ctr < 0.02;
}

// Facet words the page can HONESTLY back, in priority order, capped to avoid
// keyword stuffing.
function realFacets(pack, intent, content) {
  const c = content || {};
  const out = [];
  if (intent !== 'direct' && c.hasDirectInfo && pack.facet.direct) out.push(pack.facet.direct);
  if (intent !== 'price' && c.hasPrice && pack.facet.price) out.push(pack.facet.price);
  if (intent !== 'distance' && c.hasDistance && pack.facet.distance) out.push(pack.facet.distance);
  return out.slice(0, 2);
}

function buildOptimizationSuggestions({ elements = {}, gsc = null, dominantIntent = null, lang = 'de' } = {}) {
  const pack = LANGPACK[lang];
  const cities = parseCities(elements, lang);
  const opp = ctrOpportunity(gsc);
  const content = elements.content || {};
  const facts = elements.facts || {};
  const intent = dominantIntent || 'flight';

  // Unsupported language, or cities unparseable → honest manual-review, no guess.
  if (!pack || !cities) {
    const reason = !pack ? `اللغة "${lang}" غير مدعومة للتوليد الآلي — راجعها يدوياً.` : 'تعذّر استخراج اسمَي المدينتين من الصفحة — راجعها يدوياً.';
    return {
      cities,
      opportunity: opp,
      dominantIntent: intent,
      title: { current: elements.title || null, proposed: null, changeRecommended: false, reason },
      meta: { current: elements.metaDescription || null, proposed: null, changeRecommended: false, reason },
      h1: { current: elements.h1 || null, proposed: null, changeRecommended: false, reason },
      content: { current: null, proposed: null, changeRecommended: false, reason, factsUsed: [] },
    };
  }

  const { origin: o, destination: d } = cities;
  const intentWord = pack.intentWord[intent] || pack.intentWord.flight;

  // ── TITLE ──────────────────────────────────────────────────────────────
  const curTitle = elements.title || null;
  const titleHasIntent = curTitle && intentWord && curTitle.toLowerCase().includes(intentWord.toLowerCase());
  let title;
  const buildTitle = () => {
    const facets = realFacets(pack, intent, content);
    const parts = [intentWord, ...facets].filter(Boolean);
    return `${o} → ${d}: ${parts.join(', ')} | Airpiv`;
  };
  if (!curTitle) {
    title = { current: null, proposed: buildTitle(), changeRecommended: true, reason: 'لا يوجد عنوان — اقتراح عنوان يطابق النية السائدة.' };
  } else if (curTitle.length > 65) {
    title = { current: curTitle, proposed: buildTitle(), changeRecommended: true, reason: `العنوان طويل (${curTitle.length} حرف) وقد يُقتطع — نسخة أقصر تقود بالنية.` };
  } else if (opp && intent !== 'flight' && !titleHasIntent) {
    title = { current: curTitle, proposed: buildTitle(), changeRecommended: true, reason: `فرصة CTR والعنوان لا يقود بنية "${intent}" السائدة — إعادة ترتيب ليطابقها.` };
  } else {
    title = { current: curTitle, proposed: null, changeRecommended: false, reason: titleHasIntent ? 'العنوان الحالي يطابق النية بالفعل — لا تغيير موصى به.' : 'لا فرصة واضحة — لا تغيير موصى به.' };
  }

  // ── META ───────────────────────────────────────────────────────────────
  const curMeta = elements.metaDescription || null;
  const buildMeta = () => {
    const qFn = pack.metaQuestion[intent] || pack.metaQuestion.duration;
    const question = qFn ? qFn(o, d) : '';
    // Body facets: the intent's own facet first, then other real ones.
    const facetWords = [];
    if (pack.metaFacets[intent]) facetWords.push(pack.metaFacets[intent]);
    if (content.hasDirectInfo && intent !== 'direct' && pack.metaFacets.direct) facetWords.push(pack.metaFacets.direct);
    if (content.hasPrice && intent !== 'price' && pack.metaFacets.price) facetWords.push(pack.metaFacets.price);
    const body = facetWords.slice(0, 3).join(', ');
    return `${question} ${pack.lead} ${body} ${pack.metaTail(o, d)}`.replace(/\s+/g, ' ').trim();
  };
  const metaIsQuestion = curMeta && /\?/.test(curMeta);
  let meta;
  if (!curMeta) {
    meta = { current: null, proposed: buildMeta(), changeRecommended: true, reason: 'لا يوجد وصف — اقتراح وصف يجيب النية السائدة.' };
  } else if (opp && intent !== 'flight' && !metaIsQuestion && pack.metaQuestion[intent]) {
    meta = { current: curMeta, proposed: buildMeta(), changeRecommended: true, reason: `فرصة CTR — وصف بصيغة سؤال يطابق نية "${intent}" قد يرفع نسبة النقر.` };
  } else {
    meta = { current: curMeta, proposed: null, changeRecommended: false, reason: 'الوصف الحالي مناسب — لا تغيير موصى به.' };
  }

  // ── H1 (Phase 9 — change only when weak/missing) ────────────────────────
  const curH1 = elements.h1 || null;
  let h1;
  if (!curH1) h1 = { current: null, proposed: pack.h1(o, d), changeRecommended: true, reason: 'لا يوجد H1 — اقتراح H1 واضح.' };
  else h1 = { current: curH1, proposed: null, changeRecommended: false, reason: 'H1 الحالي واضح ويطابق المسار — لا تغيير موصى به.' };

  // ── CONTENT (unique intro + FAQ, grounded in real facts only) ───────────
  const contentSuggestion = buildContent(pack, o, d, intent, content, facts);

  return { cities, opportunity: opp, dominantIntent: intent, title, meta, h1, content: contentSuggestion };
}

module.exports = { buildOptimizationSuggestions, parseCities, buildContent };
