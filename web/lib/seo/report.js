'use strict';

// [GSC-REPORT §3/§4] Turns raw GSC rows into the opportunity report: normalize →
// classify → attach operator status → sort. Pure and data-independent — the
// caller supplies the rows (from an export fixture in tests, or a live GSC/API
// feed in the admin route). No GSC numbers live here.

const { classifyOpportunity, computeCtr, SORT_ORDER, STATUS } = require('./gsc-opportunity');
const { normalizeGscRows } = require('./normalize');

// Operator state (optimization status + last-optimized date) is NOT in GSC —
// it comes from a per-URL overlay the caller passes in (keyed by slug or url).
// Absent → a freshly-seen row defaults to ANALYZED (we just classified it),
// never a fabricated "optimized"/"winner".
function statusFor(overlay, row) {
  const rec = overlay && (overlay[row.slug] || overlay[row.url]);
  const status = rec && STATUS[rec.status] ? rec.status : STATUS.ANALYZED;
  const lastOptimizedAt = rec && rec.lastOptimizedAt ? rec.lastOptimizedAt : null;
  return { status, lastOptimizedAt };
}

// Build the report rows. `rawRows` is any GSC-shaped array; `overlay` is the
// optional per-URL operator state map. Returns rows carrying every §3 field.
function buildOpportunityReport(rawRows, overlay = {}) {
  const rows = normalizeGscRows(rawRows).map((r) => {
    const opportunity = classifyOpportunity(r);
    const ctr = computeCtr(r.clicks, r.impressions);
    const { status, lastOptimizedAt } = statusFor(overlay, r);
    return {
      url: r.url,
      slug: r.slug,
      language: r.language,
      primaryQuery: r.primaryQuery, // null when the export had no query column
      impressions: r.impressions,
      clicks: r.clicks, // null = unknown (not 0)
      ctr, // null = n/a (clicks unknown or 0 impressions)
      position: r.position,
      category: opportunity.category, // null = unknown data
      isPriority: opportunity.isPriority,
      lastOptimizedAt,
      status,
    };
  });
  return sortReport(rows);
}

// [§4] Sort: category order BREAKOUT → VERY_HIGH → HIGH → NORMAL → LOW, then
// unknown-category rows; within a category, highest impressions first, then best
// (lowest) position. Stable and deterministic.
function sortReport(rows) {
  const rank = (cat) => {
    const i = SORT_ORDER.indexOf(cat);
    return i === -1 ? SORT_ORDER.length : i; // null/unknown → last
  };
  return [...rows].sort((a, b) => {
    const ra = rank(a.category);
    const rb = rank(b.category);
    if (ra !== rb) return ra - rb;
    const ia = a.impressions == null ? -1 : a.impressions;
    const ib = b.impressions == null ? -1 : b.impressions;
    if (ib !== ia) return ib - ia; // impressions desc
    const pa = a.position == null ? Infinity : a.position;
    const pb = b.position == null ? Infinity : b.position;
    return pa - pb; // best (lowest) position first
  });
}

module.exports = { buildOpportunityReport, sortReport };
