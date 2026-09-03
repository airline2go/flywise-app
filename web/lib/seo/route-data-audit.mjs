// [ROUTE-DATA-AUDIT] Phase 28/29: a pure, reusable data-quality auditor for
// route rows. Given an array of route rows (as returned by content-api or the
// DB) it returns a structured report of every invariant violation, so the same
// checks can run in a unit test, an ad-hoc CLI sweep (scripts/audit-route-data.mjs),
// or a scheduled daily job (Phase 48) — one definition of "valid route", not a
// SQL query copy-pasted in three places.
//
// It never mutates and never throws on bad data; it only classifies. Severity:
//   • 'critical' — a genuine internal contradiction or broken row that should
//     block indexing (mirrors the renderer's noindex gate).
//   • 'warning'  — a stale/soft issue (e.g. a stored scalar out of sync with
//     its canonical source) that does not by itself make the page wrong.

// Each check: [code, severity, predicate(row) → truthy when VIOLATED, detail(row)].
const CHECKS = [
  ['origin-equals-destination', 'critical',
    (r) => r.origin_iata && r.origin_iata === r.destination_iata,
    (r) => `${r.origin_iata}=${r.destination_iata}`],
  ['missing-iata', 'critical',
    (r) => !r.origin_iata || !r.destination_iata,
    (r) => `origin=${r.origin_iata ?? '∅'} dest=${r.destination_iata ?? '∅'}`],
  ['missing-slug', 'critical', (r) => !r.slug, () => 'no slug'],
  ['bad-distance', 'critical',
    (r) => r.distance_km != null && Number(r.distance_km) <= 0,
    (r) => `distance_km=${r.distance_km}`],
  ['negative-price', 'critical',
    (r) => [r.price_min, r.price_avg, r.price_max].some((p) => p != null && Number(p) < 0),
    (r) => `min=${r.price_min} avg=${r.price_avg} max=${r.price_max}`],
  ['price-order', 'critical',
    (r) => (r.price_min != null && r.price_max != null && Number(r.price_min) > Number(r.price_max))
        || (r.price_avg != null && r.price_min != null && Number(r.price_avg) < Number(r.price_min))
        || (r.price_avg != null && r.price_max != null && Number(r.price_avg) > Number(r.price_max)),
    (r) => `min=${r.price_min} avg=${r.price_avg} max=${r.price_max}`],
  ['bad-avg-duration', 'critical',
    (r) => r.avg_duration_min != null && Number(r.avg_duration_min) <= 0,
    (r) => `avg_duration_min=${r.avg_duration_min}`],
  ['min-gt-avg-duration', 'critical',
    (r) => r.min_duration_min != null && r.avg_duration_min != null && Number(r.min_duration_min) > Number(r.avg_duration_min),
    (r) => `min=${r.min_duration_min} > avg=${r.avg_duration_min}`],
  ['negative-airline-count', 'critical',
    (r) => r.airline_count != null && Number(r.airline_count) < 0,
    (r) => `airline_count=${r.airline_count}`],
  ['bad-haul-type', 'warning',
    (r) => r.haul_type != null && !['short-haul', 'medium-haul', 'long-haul'].includes(r.haul_type),
    (r) => `haul_type=${r.haul_type}`],
  ['future-price-timestamp', 'warning',
    (r) => isFuture(r.price_updated_at),
    (r) => `price_updated_at=${r.price_updated_at}`],
  ['future-insights-timestamp', 'warning',
    (r) => isFuture(r.insights_updated_at),
    (r) => `insights_updated_at=${r.insights_updated_at}`],
  ['stop-distribution-negative', 'critical',
    (r) => hasNegativeStopBucket(r.stop_distribution),
    (r) => `stop_distribution=${JSON.stringify(r.stop_distribution)}`],
  ['all-direct-but-has-stops', 'critical',
    (r) => r.all_direct === true && connectingCount(r.stop_distribution) > 0,
    (r) => `all_direct=true but connecting=${connectingCount(r.stop_distribution)}`],
];

function isFuture(ts, now = Date.now()) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && t > now;
}
function stopEntries(sd) {
  return sd && typeof sd === 'object' ? Object.entries(sd) : [];
}
function hasNegativeStopBucket(sd) {
  return stopEntries(sd).some(([, v]) => Number(v) < 0);
}
function connectingCount(sd) {
  return stopEntries(sd).reduce((s, [k, v]) => (k !== '0' ? s + Number(v || 0) : s), 0);
}

// Audit one row → array of { slug, code, severity, detail }.
export function auditRoute(row, now = Date.now()) {
  const issues = [];
  for (const [code, severity, predicate, detail] of CHECKS) {
    let violated = false;
    try { violated = !!predicate(row, now); } catch { violated = false; }
    if (violated) issues.push({ slug: row.slug || null, code, severity, detail: detail(row) });
  }
  return issues;
}

// Audit an array of rows → a structured report. `uniqueAirlinesBySlug` is an
// optional map slug → real unique-airline count (from the route_airlines join),
// enabling the Phase 13 stored-scalar-vs-canonical check when the caller has it.
export function auditRoutes(rows, { uniqueAirlinesBySlug, now = Date.now() } = {}) {
  const issues = [];
  for (const row of rows) {
    issues.push(...auditRoute(row, now));
    if (uniqueAirlinesBySlug && row.airline_count != null) {
      const actual = uniqueAirlinesBySlug.get(row.slug);
      if (actual != null && actual !== Number(row.airline_count)) {
        issues.push({ slug: row.slug || null, code: 'airline-count-vs-join', severity: 'warning', detail: `stored=${row.airline_count} unique=${actual}` });
      }
    }
  }
  const byCode = {};
  const bySeverity = { critical: 0, warning: 0 };
  for (const i of issues) {
    byCode[i.code] = (byCode[i.code] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  }
  return { total: rows.length, issueCount: issues.length, bySeverity, byCode, issues };
}
