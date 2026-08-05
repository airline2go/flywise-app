'use strict';

// [CONTENT-OPPORTUNITY] Transparent, weighted scoring of how worthwhile it is
// to (re)create content for a route/page — the model behind the "Content
// Opportunity Score" card and the "Recommended Today" engine. Every signal is
// REAL data when supplied; a missing signal contributes nothing and is
// reported in `missing`, so the score is never a black box or an invented
// number.
//
// Signal sources:
//   ROUTE data (route_pages / route_price_history — available now):
//     priceDrop    — computed from route_price_history (recent vs baseline)
//     popularity   — route_score (0–100)
//     airlineCount — number of airlines on the route
//     direct       — 'all' | 'some' | null (all_direct / direct_flight_available)
//     seasonality  — 'low' | 'medium' | 'high' (optional, when derivable)
//   SEARCH data (Google Search Console — Priority 2, absent until connected):
//     searchVolume — impressions / keyword volume
//     position     — average position
//     ctr          — 'low'|'medium'|'high' or a fraction
//     competition  — 'low'|'medium'|'high'

const LEVEL = { low: 0, medium: 1, high: 2 };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Max points per signal (sum = 100). Route-available signals
// (priceDrop+popularity+airlineCount+direct) sum to 64, so a strong route can
// reach 4 stars from real data alone; Search Console signals push it to 5.
const WEIGHTS = {
  priceDrop: 25, popularity: 24, airlineCount: 12, direct: 9,
  demand: 8, position: 8, ctr: 4, competition: 2, seasonality: 8,
};

// priceDrop: boolean/'yes' = a solid drop; a number is treated as a percentage
// and scaled by magnitude.
function priceDropPoints(pd) {
  if (pd == null) return null;
  if (pd === true || String(pd).toLowerCase() === 'yes') return WEIGHTS.priceDrop * 0.75;
  if (pd === false || String(pd).toLowerCase() === 'no') return 0;
  const pct = Number(pd);
  if (Number.isNaN(pct) || pct <= 0) return 0;
  const frac = pct >= 20 ? 1 : pct >= 12 ? 0.82 : pct >= 6 ? 0.55 : 0.3;
  return WEIGHTS.priceDrop * frac;
}

// popularity: route_score, expected 0–100.
function popularityPoints(score) {
  if (score == null) return null;
  const n = Number(score);
  if (Number.isNaN(n) || n <= 0) return 0;
  return clamp((n / 100) * WEIGHTS.popularity, 0, WEIGHTS.popularity);
}

function airlineCountPoints(n) {
  if (n == null) return null;
  const c = Number(n);
  if (Number.isNaN(c) || c <= 0) return 0;
  const frac = c >= 5 ? 1 : c === 4 ? 0.85 : c === 3 ? 0.7 : c === 2 ? 0.5 : 0.25;
  return WEIGHTS.airlineCount * frac;
}

function directPoints(d) {
  if (d == null) return null;
  const v = d === true ? 'all' : String(d).toLowerCase();
  if (v === 'all') return WEIGHTS.direct;
  if (v === 'some' || v === 'true') return WEIGHTS.direct * 0.6;
  return 0;
}

// Demand: log-scaled impressions/volume. 0 -> 0, ~1000+ -> full.
function demandPoints(v) {
  if (v == null) return null;
  const n = Math.max(0, Number(v) || 0);
  return n <= 0 ? 0 : clamp((Math.log10(n + 1) / 3) * WEIGHTS.demand, 0, WEIGHTS.demand);
}

// Ranking opportunity: page-2 (11–20) is the sweet spot — real impressions,
// few clicks, a small push wins. Top-3 already captured; deep pages are hard.
function positionPoints(p) {
  if (p == null) return null;
  const n = Number(p);
  if (!(n > 0)) return 0;
  const W = WEIGHTS.position;
  if (n <= 3) return W * 0.24;
  if (n <= 10) return W * 0.64;
  if (n <= 20) return W;
  if (n <= 30) return W * 0.6;
  if (n <= 50) return W * 0.32;
  return W * 0.12;
}

function ctrPoints(ctr) {
  if (ctr == null) return null;
  let l;
  if (typeof ctr === 'string' && ctr.toLowerCase() in LEVEL) l = LEVEL[ctr.toLowerCase()];
  else { const c = Number(ctr); l = c < 0.02 ? 0 : c < 0.05 ? 1 : 2; }
  return [WEIGHTS.ctr, WEIGHTS.ctr * 0.53, WEIGHTS.ctr * 0.2][l];
}

function competitionPoints(c) {
  if (c == null) return null;
  const l = LEVEL[String(c).toLowerCase()];
  return l == null ? null : [WEIGHTS.competition, WEIGHTS.competition * 0.6, WEIGHTS.competition * 0.2][l];
}

function seasonalityPoints(s) {
  if (s == null) return null;
  const l = LEVEL[String(s).toLowerCase()];
  return l == null ? null : [WEIGHTS.seasonality * 0.2, WEIGHTS.seasonality * 0.6, WEIGHTS.seasonality][l];
}

function starsFor(score) {
  if (score >= 82) return 5;
  if (score >= 64) return 4;
  if (score >= 46) return 3;
  if (score >= 28) return 2;
  return 1;
}

// Human-readable reasons, strongest first — so the operator sees WHY.
function buildReasons(signals, inputs) {
  const r = [];
  if (signals.priceDrop) r.push({ w: signals.priceDrop, text: 'Live price drop — timely hook for a deal post.' });
  if (signals.popularity != null && signals.popularity >= WEIGHTS.popularity * 0.6) r.push({ w: signals.popularity, text: 'Popular route (high route score).' });
  if (signals.position != null && Number(inputs.position) > 10 && Number(inputs.position) <= 20) r.push({ w: signals.position, text: `Ranks on page 2 (pos ${inputs.position}) — a refresh can win real clicks.` });
  else if (signals.position != null && Number(inputs.position) <= 10 && Number(inputs.position) > 0) r.push({ w: signals.position, text: `Already ranks on page 1 (pos ${inputs.position}).` });
  if (signals.ctr != null && signals.ctr >= WEIGHTS.ctr) r.push({ w: signals.ctr, text: 'Low CTR — a better title/meta can lift clicks.' });
  if (signals.airlineCount != null && Number(inputs.airlineCount) >= 3) r.push({ w: signals.airlineCount, text: `${inputs.airlineCount} airlines compete — good price angle.` });
  if (signals.direct === WEIGHTS.direct) r.push({ w: signals.direct, text: 'Direct flights — easy to sell.' });
  if (signals.demand != null && signals.demand >= WEIGHTS.demand * 0.6) r.push({ w: signals.demand, text: 'Strong search demand.' });
  if (signals.seasonality === WEIGHTS.seasonality) r.push({ w: WEIGHTS.seasonality, text: 'In peak season — publish now.' });
  return r.sort((a, b) => b.w - a.w).map((x) => x.text);
}

// Score a single opportunity. `inputs` carries whatever real signals exist;
// `subject` ({ type, slug }) is passed through so "Generate Content" can hand
// it straight to the social generator.
function scoreOpportunity(inputs = {}, subject = null) {
  const signals = {
    priceDrop: priceDropPoints(inputs.priceDrop),
    popularity: popularityPoints(inputs.popularity),
    airlineCount: airlineCountPoints(inputs.airlineCount),
    direct: directPoints(inputs.direct),
    demand: demandPoints(inputs.searchVolume),
    position: positionPoints(inputs.position),
    ctr: ctrPoints(inputs.ctr),
    competition: competitionPoints(inputs.competition),
    seasonality: seasonalityPoints(inputs.seasonality),
  };

  const present = Object.entries(signals).filter(([, v]) => v != null);
  const missing = Object.entries(signals).filter(([, v]) => v == null).map(([k]) => k);
  const score = Math.round(present.reduce((sum, [, v]) => sum + v, 0));
  const stars = starsFor(score);
  const reasons = buildReasons(signals, inputs);

  const suggestedTemplate = signals.priceDrop ? 'flight_deal'
    : subject && subject.type === 'city' ? 'city_guide'
      : subject && subject.type === 'blog' ? 'blog_promo'
        : 'flight_deal';

  const recommendation = stars >= 4
    ? 'High-priority: generate & publish content now.'
    : stars === 3
      ? 'Worthwhile: queue content for this route.'
      : 'Low priority right now — revisit when demand or a price drop appears.';

  return { subject, score, stars, recommendation, suggestedTemplate, reasons, signals, missing, dataComplete: missing.length === 0 };
}

// Rank a list of opportunities (highest score first) for the dashboard list.
function rankOpportunities(items = []) {
  return items
    .map((it) => ({ ...scoreOpportunity(it.inputs || it, it.subject || null), input: it }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreOpportunity, rankOpportunities, starsFor, WEIGHTS };
