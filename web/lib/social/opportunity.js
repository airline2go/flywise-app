'use strict';

// [CONTENT-OPPORTUNITY] Transparent, weighted scoring of how worthwhile it is
// to (re)create content for a route/page — the model behind the "Content
// Opportunity Score" card. Every signal is REAL data when supplied; a missing
// signal simply contributes nothing and is reported in `missing`, so the score
// is never a black box or an invented number.
//
// Signal sources:
//   searchVolume  — Search Console impressions / keyword volume (needs GSC)
//   position      — Search Console average position          (needs GSC)
//   ctr           — Search Console CTR ('low'|'medium'|'high' or fraction) (GSC)
//   competition   — 'low'|'medium'|'high' (keyword tool, optional)
//   priceDrop     — from route_price_history (REAL, already in the DB)
//   seasonality   — 'low'|'medium'|'high' (derived from price-history variance)

const LEVEL = { low: 0, medium: 1, high: 2 };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Max points each signal can contribute (sum = 100).
const WEIGHTS = { demand: 30, position: 25, ctr: 15, competition: 10, priceDrop: 10, seasonality: 10 };

// Demand: log-scaled impressions/volume. 0 -> 0, ~1000+ -> full 30.
function demandPoints(v) {
  if (v == null) return null;
  const n = Math.max(0, Number(v) || 0);
  return n <= 0 ? 0 : clamp((Math.log10(n + 1) / 3) * WEIGHTS.demand, 0, WEIGHTS.demand);
}

// Ranking opportunity: page-2 (positions 11–20) is the sweet spot — real
// impressions, few clicks, a small push wins. Top-3 is already captured;
// deep pages are hard.
function positionPoints(p) {
  if (p == null) return null;
  const n = Number(p);
  if (!(n > 0)) return 0;
  if (n <= 3) return 6;
  if (n <= 10) return 16;
  if (n <= 20) return 25;
  if (n <= 30) return 15;
  if (n <= 50) return 8;
  return 3;
}

// Low CTR against real impressions = a title/meta opportunity.
function ctrPoints(ctr) {
  if (ctr == null) return null;
  let l;
  if (typeof ctr === 'string' && ctr.toLowerCase() in LEVEL) l = LEVEL[ctr.toLowerCase()];
  else { const c = Number(ctr); l = c < 0.02 ? 0 : c < 0.05 ? 1 : 2; }
  return [15, 8, 3][l];
}

function competitionPoints(c) {
  if (c == null) return null;
  const l = LEVEL[String(c).toLowerCase()];
  return l == null ? null : [10, 6, 2][l];
}

function priceDropPoints(pd) {
  if (pd == null) return null;
  const on = pd === true || (typeof pd === 'number' && pd > 0) || String(pd).toLowerCase() === 'yes';
  return on ? WEIGHTS.priceDrop : 0;
}

function seasonalityPoints(s) {
  if (s == null) return null;
  const l = LEVEL[String(s).toLowerCase()];
  return l == null ? null : [2, 6, 10][l];
}

function starsFor(score) {
  if (score >= 82) return 5;
  if (score >= 64) return 4;
  if (score >= 46) return 3;
  if (score >= 28) return 2;
  return 1;
}

// Human-readable reasons for the score, strongest first — so the operator sees
// WHY, not just a number.
function buildReasons(signals, inputs) {
  const r = [];
  if (signals.priceDrop) r.push({ weight: signals.priceDrop, text: 'Live price drop — timely hook for a deal post.' });
  if (signals.position != null && Number(inputs.position) > 10 && Number(inputs.position) <= 20) r.push({ weight: signals.position, text: `Ranks on page 2 (pos ${inputs.position}) — a refresh can win real clicks.` });
  else if (signals.position != null && Number(inputs.position) <= 10) r.push({ weight: signals.position, text: `Already ranks on page 1 (pos ${inputs.position}).` });
  if (signals.ctr != null && signals.ctr >= 15) r.push({ weight: signals.ctr, text: 'Low CTR — better title/meta can lift clicks without new rankings.' });
  if (signals.demand != null && signals.demand >= 18) r.push({ weight: signals.demand, text: 'Strong search demand.' });
  if (signals.seasonality === 10) r.push({ weight: 10, text: 'In peak season — publish now.' });
  if (signals.competition === 10) r.push({ weight: 10, text: 'Low competition — easier to rank.' });
  return r.sort((a, b) => b.weight - a.weight).map((x) => x.text);
}

// Score a single opportunity. `inputs` carries whatever real signals exist;
// `subject` ({ type, slug }) is passed through so the "Generate Content" action
// can hand it straight to the social generator.
function scoreOpportunity(inputs = {}, subject = null) {
  const signals = {
    demand: demandPoints(inputs.searchVolume),
    position: positionPoints(inputs.position),
    ctr: ctrPoints(inputs.ctr),
    competition: competitionPoints(inputs.competition),
    priceDrop: priceDropPoints(inputs.priceDrop),
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

  return {
    subject,
    score,
    stars,
    recommendation,
    suggestedTemplate,
    reasons,
    signals,
    missing, // signals with no data yet (e.g. GSC not connected)
    dataComplete: missing.length === 0,
  };
}

// Rank a list of opportunities (highest score first) for a dashboard list.
function rankOpportunities(items = []) {
  return items
    .map((it) => ({ ...scoreOpportunity(it.inputs || it, it.subject || null), input: it }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreOpportunity, rankOpportunities, starsFor, WEIGHTS };
