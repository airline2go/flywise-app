// Contextual internal-link recommendations for flight route pages.
// Keep this deliberately relevance-first: links should help the traveler
// continue their journey, not merely inflate the number of internal links.
const RELATED_ROUTE_LIMIT = 6;
const POPULAR_ROUTE_SCORE_THRESHOLD = 50;
const SIMILAR_TRIP_DISTANCE_TOLERANCE_KM = 500;

function scoreRelatedRoute(route, candidate) {
  const sameOrigin = candidate.origin_city === route.origin_city;
  const sameDestination = candidate.destination_city === route.destination_city;
  const sameCityPair = sameOrigin && sameDestination;
  const sameHaul = !!(route.haul_type && candidate.haul_type === route.haul_type);
  const similarDistance = route.distance_km != null && candidate.distance_km != null
    && Math.abs(candidate.distance_km - route.distance_km) <= SIMILAR_TRIP_DISTANCE_TOLERANCE_KM;
  const sameRegion = !!(
    candidate.destination_country
    && candidate.destination_country === route.destination_country
    && candidate.destination_city !== route.destination_city
  );

  let reasonKey = null;
  if (candidate.route_score != null && candidate.route_score >= POPULAR_ROUTE_SCORE_THRESHOLD) reasonKey = 'popularWithTravelers';
  else if (candidate.airline_count != null && candidate.airline_count >= 2) reasonKey = 'moreFlightOptions';
  else if (sameHaul && similarDistance) reasonKey = 'similarTripLength';
  else if (sameRegion) reasonKey = 'sameRegion';

  // Endpoint relevance dominates popularity. A highly searched route in the
  // same destination city is normally more useful than a popular but unrelated
  // route elsewhere in the destination country.
  const endpointScore = sameCityPair ? 55 : (sameDestination ? 42 : (sameOrigin ? 36 : 0));
  const score = endpointScore
    + (sameHaul ? 5 : 0)
    + (similarDistance ? 4 : 0)
    + (sameRegion ? 2 : 0)
    + Math.min(candidate.route_score || 0, 500) * 0.01
    + Math.min(candidate.airline_count || 0, 10) * 0.5;

  return { candidate, score, reasonKey };
}

function computeRelatedRoutes(route, routeList) {
  // Never recommend the current page, its exact reverse, or a route explicitly
  // marked non-indexable. Missing indexable metadata remains allowed for
  // backwards compatibility with older cached route feeds.
  const candidates = routeList.filter((r) => r.slug !== route.slug
    && !(r.origin_city === route.destination_city && r.destination_city === route.origin_city)
    && r.indexable !== false
    && (r.origin_city === route.origin_city
      || r.destination_city === route.destination_city
      || (route.destination_country && r.destination_country === route.destination_country)));

  return candidates
    .map((c) => scoreRelatedRoute(route, c))
    .sort((a, b) => (b.score - a.score)
      || ((b.candidate.route_score || 0) - (a.candidate.route_score || 0))
      || String(a.candidate.slug).localeCompare(String(b.candidate.slug)))
    .slice(0, RELATED_ROUTE_LIMIT)
    .map(({ candidate, reasonKey }) => Object.assign({}, candidate, { reasonKey }));
}

export { computeRelatedRoutes, scoreRelatedRoute };
