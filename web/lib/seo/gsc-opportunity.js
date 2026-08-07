'use strict';

// [GSC-OPPORTUNITY §16] A small, deterministic, DATA-INDEPENDENT classifier that
// labels a single Google Search Console row with an SEO opportunity category
// from two real signals only — `impressions` and `position`. It is purely an
// OPPORTUNITY DETECTOR: it never changes titles/meta/content and never invents
// data. It carries NO GSC numbers of its own — every value comes from the row
// passed in, so the current export can be swapped for a live GSC API later
// without touching this file (see lib/seo/normalize.js + report.js).
//
// It is deliberately SEPARATE from lib/social/opportunity.js (a weighted 0–100
// content-generation score). This one answers a single yes/no-ish question:
// "is this URL worth investigating for a ranking/CTR win right now?"
//
// Category thresholds — copied verbatim from the brief, and the WHOLE
// definition of each category (nothing inferred or estimated):
//   VERY_HIGH : impressions >= 40 AND position <= 12
//   BREAKOUT  : position <= 5  AND impressions >= 10
//   HIGH      : impressions >= 20 AND position <= 15
//   LOW       : position > 25    AND impressions < 5
//   NORMAL    : has data, but no threshold above fired (the explicit neutral
//               bucket — a data-having row is NEVER forced into LOW)
// A row missing/!finite in either signal is category `null` (UNKNOWN) — never
// guessed, never crashed on.

const CATEGORY = {
  BREAKOUT: 'BREAKOUT',
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
};

// [§2 PRIORITY] When several thresholds fire for one row, the assigned category
// is the FIRST match in this order. BREAKOUT (near the top of page 1) is the
// most actionable and wins over VERY_HIGH; e.g. impressions 50 / position 4
// matches BREAKOUT + VERY_HIGH + HIGH and is labeled BREAKOUT.
const RESOLUTION_PRIORITY = [CATEGORY.BREAKOUT, CATEGORY.VERY_HIGH, CATEGORY.HIGH, CATEGORY.LOW, CATEGORY.NORMAL];

// [§4 SORTING] The report/UI order is DIFFERENT from the resolution priority:
// NORMAL sorts ABOVE LOW (a normal page is a better bet than a bottom-of-results
// one). Used by report.js to order the work queue.
const SORT_ORDER = [CATEGORY.BREAKOUT, CATEGORY.VERY_HIGH, CATEGORY.HIGH, CATEGORY.NORMAL, CATEGORY.LOW];

// Categories the brief tells us to prioritize spending time on.
const PRIORITY_CATEGORIES = new Set([CATEGORY.BREAKOUT, CATEGORY.VERY_HIGH, CATEGORY.HIGH]);

// [§19] Optimization lifecycle statuses. These are OPERATOR state (not derived
// from GSC): NEW → ANALYZED (scored) → OPTIMIZED (page changed) → MONITORING
// (waiting for post-change GSC data) → WINNER / NEEDS_REWORK. The classifier
// never advances a status on its own — §8: any SEO change is a separate,
// controlled, manual action.
const STATUS = {
  NEW: 'NEW',
  ANALYZED: 'ANALYZED',
  OPTIMIZED: 'OPTIMIZED',
  MONITORING: 'MONITORING',
  WINNER: 'WINNER',
  NEEDS_REWORK: 'NEEDS_REWORK',
};
const STATUS_VALUES = Object.values(STATUS);

// Every threshold this row satisfies (excludes NORMAL — that is the residual).
function matchedCategories(imp, pos) {
  const out = [];
  if (pos <= 5 && imp >= 10) out.push(CATEGORY.BREAKOUT);
  if (imp >= 40 && pos <= 12) out.push(CATEGORY.VERY_HIGH);
  if (imp >= 20 && pos <= 15) out.push(CATEGORY.HIGH);
  if (pos > 25 && imp < 5) out.push(CATEGORY.LOW);
  return out;
}

// Classify one row. Only `impressions` and `position` affect the category;
// anything else is ignored (and never invented). Malformed/missing input yields
// `{ category: null }` — the caller decides how to display "unknown".
function classifyOpportunity(row = {}) {
  // `= {}` only defaults `undefined`, not `null` — and Number(null) is 0, which
  // would misclassify a null row as NORMAL. Guard non-objects explicitly.
  if (!row || typeof row !== 'object') {
    return { category: null, matched: [], isPriority: false, reason: 'no row' };
  }
  const imp = Number(row.impressions);
  const pos = Number(row.position);
  if (!Number.isFinite(imp) || !Number.isFinite(pos)) {
    return { category: null, matched: [], isPriority: false, reason: 'missing or non-numeric impressions/position' };
  }
  const matched = matchedCategories(imp, pos);
  const category = RESOLUTION_PRIORITY.find((c) => matched.includes(c)) || CATEGORY.NORMAL;
  return {
    category,
    matched,
    isPriority: PRIORITY_CATEGORIES.has(category),
    reason: matched.length ? `matched ${matched.join(', ')}` : 'has data, no threshold fired',
  };
}

// Compute CTR ONLY from real clicks + impressions. Returns null when clicks are
// unknown (null/undefined — e.g. a GSC export that only carried per-country/
// per-device click totals, not per-URL) — reported as "n/a", never a fake 0%.
// Note Number(null) === 0, so the null check must come first.
function computeCtr(clicks, impressions) {
  if (clicks == null) return null;
  const c = Number(clicks);
  const imp = Number(impressions);
  if (!Number.isFinite(c) || !Number.isFinite(imp) || imp <= 0) return null;
  return c / imp;
}

module.exports = {
  CATEGORY,
  RESOLUTION_PRIORITY,
  SORT_ORDER,
  PRIORITY_CATEGORIES,
  STATUS,
  STATUS_VALUES,
  classifyOpportunity,
  matchedCategories,
  computeCtr,
};
