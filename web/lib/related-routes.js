// Ported verbatim from flywise-app/build/generate-pages.js's
// computeRelatedRoutes()/scoreRelatedRoute() — including the
// reverse-direction exclusion bug fix from this session's earlier work
// (Hamburg->Barcelona no longer shows as "related" on the
// Barcelona->Hamburg page). Pure function of (route, routeList), so it
// works identically whether routeList comes from a batch build's
// in-memory list or a per-request cached fetch (see content-api.js's
// listRoutePages(), which Next's fetch cache shares across requests
// within the `revalidate` window — this doesn't refetch per visitor).
const RELATED_ROUTE_LIMIT = 6;
const POPULAR_ROUTE_SCORE_THRESHOLD = 50;
const SIMILAR_TRIP_DISTANCE_TOLERANCE_KM = 500;

function scoreRelatedRoute(route, candidate) {
  const sameOriginOrDest = candidate.origin_city === route.origin_city || candidate.destination_city === route.destination_city;
  const sameHaul = !!(route.haul_type && candidate.haul_type === route.haul_type);
  const similarDistance = route.distance_km != null && candidate.distance_km != null
    && Math.abs(candidate.distance_km - route.distance_km) <= SIMILAR_TRIP_DISTANCE_TOLERANCE_KM;
  const sameRegion = !!(candidate.destination_country && candidate.destination_country === route.destination_country && candidate.destination_city !== route.destination_city);

  let reasonKey = null;
  if (candidate.route_score != null && candidate.route_score >= POPULAR_ROUTE_SCORE_THRESHOLD) reasonKey = 'popularWithTravelers';
  else if (candidate.airline_count != null && candidate.airline_count >= 2) reasonKey = 'moreFlightOptions';
  else if (sameHaul && similarDistance) reasonKey = 'similarTripLength';
  else if (sameRegion) reasonKey = 'sameRegion';

  const score = (sameOriginOrDest ? 10 : 0)
    + (sameHaul ? 3 : 0)
    + (similarDistance ? 2 : 0)
    + Math.min(candidate.route_score || 0, 500) * 0.02
    + Math.min(candidate.airline_count || 0, 10);

  return { candidate, score, reasonKey };
}

function computeRelatedRoutes(route, routeList) {
  // [BUG-FIX] Exclude not just this exact slug but also the reverse-direction
  // same-city-pair route (e.g. Hamburg->Barcelona showing up as "related" on
  // the Barcelona->Hamburg page) — same trip, opposite direction, not a
  // useful suggestion.
  const candidates = routeList.filter((r) => r.slug !== route.slug
    && !(r.origin_city === route.destination_city && r.destination_city === route.origin_city)
    && (r.origin_city === route.origin_city || r.destination_city === route.destination_city
      || (route.destination_country && r.destination_country === route.destination_country)));

  return candidates
    .map((c) => scoreRelatedRoute(route, c))
    .sort((a, b) => b.score - a.score)
    .slice(0, RELATED_ROUTE_LIMIT)
    .map(({ candidate, reasonKey }) => Object.assign({}, candidate, { reasonKey }));
}

export { computeRelatedRoutes, scoreRelatedRoute };
