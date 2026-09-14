// [INDEXABILITY-POLICY] P0-5 — the ONE place that decides whether a rendered
// page is indexable. Before this, each render-*.js computed its own
// `robotsContent` inline with a slightly different threshold expression, so the
// policy lived in five places and could drift. Now every renderer calls
// `robotsMeta(page)` / `isIndexable(page)` here, and the per-type thresholds are
// defined once, together, where they can be read and tested as a unit.
//
// The policy is intentionally conservative for flight routes: noindex is used
// for thin pages and for explicitly broken/contradictory data, while `follow`
// is always kept so internal-link equity continues to flow.
//
// [SEO-QUALITY-SIGNALS] Keep the evidence scoring separate from the final
// indexability verdict. The backend's explicit `indexable` flag remains the
// production source of truth; this score gives renderers/tests one normalized
// way to measure how much independent route evidence exists and prevents future
// code from treating a single weak signal (for example distance alone) as proof
// of a useful flight page.

const INDEX = 'index, follow';
const NOINDEX = 'noindex, follow';

const ROUTE_EVIDENCE_KEYS = Object.freeze([
  'airline_count',
  'avg_duration_min',
  'stop_distribution',
  'price_sample_count',
  'itinerary_count',
]);

function hasStopDistribution(value) {
  return !!(value && typeof value === 'object' && Object.keys(value).length > 0);
}

// Count independent, real flight-data signals. Distance is deliberately absent:
// it identifies geography, not evidence that flights/options actually exist.
function routeEvidenceScore(route) {
  if (!route) return 0;
  let score = 0;
  if (route.airline_count != null && Number(route.airline_count) > 0) score++;
  if (route.avg_duration_min != null && Number(route.avg_duration_min) > 0) score++;
  if (hasStopDistribution(route.stop_distribution)) score++;
  if (route.price_sample_count != null && Number(route.price_sample_count) > 0) score++;
  if (route.itinerary_count != null && Number(route.itinerary_count) > 0) score++;
  return score;
}

function isIndexable(page) {
  switch (page && page.type) {
    case 'flight-route':
      return !((!page.hasRealRouteData && !page.hasAdminContent) || page.hasCriticalError);

    case 'airport':
    case 'city':
      return !(page.destinationCount <= 1 && !page.hasAdminContent);

    case 'country':
      return !((page.destinationCount + page.domesticCount) <= 1 && !page.hasAdminContent);

    case 'airline':
      return !(page.routeCount <= 1 && !page.hasAdminContent);

    default:
      return true;
  }
}

function robotsMeta(page) {
  return isIndexable(page) ? INDEX : NOINDEX;
}

module.exports = {
  isIndexable,
  robotsMeta,
  INDEX,
  NOINDEX,
  ROUTE_EVIDENCE_KEYS,
  routeEvidenceScore,
};
