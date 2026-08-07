'use strict';

// [Phase 4 + 5] Search-query intent classification, query→route matching, and
// query→page coverage. All rule-based and factual: it categorizes real query
// strings and maps them to routes by detecting the route's own city names in
// the query text. It never invents a query, a metric, or an intent — a query
// that matches no route is simply left unmatched.

const { computeCtr } = require('./gsc-opportunity');

// Intent families, from the query patterns the brief documented. Order matters:
// a more specific intent wins over the generic "flight" fallback.
const INTENT = {
  DURATION: 'duration',
  DIRECT: 'direct',
  PRICE: 'price',
  DISTANCE: 'distance',
  FLIGHT: 'flight', // generic
};

const INTENT_KEYWORDS = [
  [INTENT.DURATION, ['flugzeit', 'flugdauer', 'wie lange', 'how long', 'duration', 'flight time', 'كم يستغرق', 'كم مدة', 'مدة الرحلة', 'duracion', 'durée', 'durata']],
  [INTENT.DIRECT, ['direktflug', 'direktflüge', 'nonstop', 'non-stop', 'non stop', 'direct', 'directo', 'مباشر', 'بدون توقف', 'sans escale', 'diretto']],
  [INTENT.PRICE, ['günstig', 'günstige', 'billig', 'cheap', 'preis', 'preise', 'price', 'precio', 'precios', 'pas cher', 'economico', 'رخيص', 'سعر', 'اسعار', 'أسعار']],
  [INTENT.DISTANCE, ['entfernung', 'wie weit', 'distance', 'distancia', 'distanza', 'كم تبعد', 'المسافة', 'مسافة']],
];

// Normalize for matching: lowercase, transliterate German umlauts (ü→ue …) so a
// query "düsseldorf" matches the slug token "duesseldorf", strip remaining
// diacritics, collapse non-alphanumerics to spaces.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim();
}

function classifyIntent(query) {
  const q = ` ${norm(query)} `;
  for (const [intent, kws] of INTENT_KEYWORDS) {
    for (const kw of kws) {
      const nk = norm(kw);
      if (q.includes(` ${nk} `) || q.includes(` ${nk}`) || q.includes(`${nk} `)) return intent;
    }
  }
  return INTENT.FLIGHT;
}

// City tokens from a route slug: drop a trailing "-<n>" variant suffix, split on
// "-", keep tokens of length ≥ 4 (city names), drop obvious connectors.
const CONNECTORS = new Set(['de', 'la', 'el', 'les', 'los', 'del', 'the', 'und', 'and', 'saint', 'sankt']);
function routeTokens(slug) {
  return String(slug || '')
    .replace(/-\d+$/, '')
    .split('-')
    .map((t) => norm(t))
    .filter((t) => t.length >= 4 && !CONNECTORS.has(t));
}

// A query matches a route when it contains at least 2 distinct city tokens of
// the route (heuristic — the operator reviews matches; nothing is auto-applied).
function queryMatchesRoute(normQuery, tokens) {
  if (tokens.length < 2) return false;
  let hits = 0;
  for (const t of tokens) if (normQuery.includes(t)) hits += 1;
  return hits >= 2;
}

// Map parsed query rows onto the routes in the report. Returns a map
// slug → [{ query, impressions, clicks, position, ctr, intent }], sorted by
// impressions desc. Queries matching no route are omitted.
function matchQueriesToRoutes(queryRows, reportRows) {
  const routes = (reportRows || []).filter((r) => r && r.slug).map((r) => ({ slug: r.slug, tokens: routeTokens(r.slug) }));
  const bySlug = {};
  for (const qr of queryRows || []) {
    if (!qr || !qr.query) continue;
    const nq = norm(qr.query);
    for (const route of routes) {
      if (!queryMatchesRoute(nq, route.tokens)) continue;
      (bySlug[route.slug] || (bySlug[route.slug] = [])).push({
        query: qr.query,
        impressions: qr.impressions,
        clicks: qr.clicks,
        position: qr.position,
        ctr: computeCtr(qr.clicks, qr.impressions),
        intent: classifyIntent(qr.query),
      });
    }
  }
  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => (Number(b.impressions) || 0) - (Number(a.impressions) || 0));
  }
  return bySlug;
}

// Summarize a route's matched queries: primary (top by impressions), secondary
// (next few), and the dominant intent (by summed impressions).
function summarizeRouteQueries(queries) {
  if (!queries || !queries.length) return { primary: null, secondary: [], dominantIntent: null, intentCounts: {} };
  const intentImpr = {};
  for (const q of queries) {
    const imp = Number(q.impressions) || 0;
    intentImpr[q.intent] = (intentImpr[q.intent] || 0) + imp;
  }
  const dominantIntent = Object.keys(intentImpr).sort((a, b) => intentImpr[b] - intentImpr[a])[0] || null;
  return { primary: queries[0], secondary: queries.slice(1, 5), dominantIntent, intentCounts: intentImpr };
}

// [Phase 5 / 10] Does the page's content already cover the dominant intent?
// Uses the real extracted content flags from analyze-page — never fabricates.
function queryPageMatch(dominantIntent, contentFlags) {
  const c = contentFlags || {};
  const map = {
    [INTENT.DURATION]: c.hasFlightTime,
    [INTENT.DIRECT]: c.hasDirectInfo,
    [INTENT.PRICE]: c.hasPrice,
    [INTENT.DISTANCE]: c.hasDistance,
    [INTENT.FLIGHT]: c.hasFlightTime || (c.faqCount || 0) > 0,
  };
  if (!dominantIntent) return { intent: null, covered: null, recommendation: 'No matched queries — import a Queries export.' };
  const covered = !!map[dominantIntent];
  return {
    intent: dominantIntent,
    covered,
    recommendation: covered
      ? `Page already covers the dominant "${dominantIntent}" intent — improve emphasis/title, don't duplicate.`
      : `Dominant "${dominantIntent}" intent not clearly covered — consider surfacing it IF real route data supports it.`,
  };
}

module.exports = { INTENT, classifyIntent, routeTokens, matchQueriesToRoutes, summarizeRouteQueries, queryPageMatch, norm };
