// ═══════════════════════════════════════════════════════════════════════
// web/lib/legacy-render/route-evidence.js
// ─────────────────────────────────────────────────────────────────────────
// FRONTEND MIRROR of the backend canonical policy in
// flywise-server/src/services/indexability.js. The two files must stay
// identical IN INTENT: a route's indexability decision has ONE definition,
// and both the backend (sitemap / indexable flag / connectivity) and this
// renderer must reach the same verdict for the same route.
//
// distance_km is NEVER flight evidence. airline_count = 0 is NEVER evidence.
// Only genuine flight-data signals — observed carriers, a real duration, a
// real stop distribution, verified price sampling, or observed itineraries —
// or approved manual editorial content makes a route indexable.
// ═══════════════════════════════════════════════════════════════════════

function evidencePolicyEnforced() {
  if (process.env.SEO_EVIDENCE_POLICY_ENFORCED == null) return true;
  return process.env.SEO_EVIDENCE_POLICY_ENFORCED === '1'
    || process.env.SEO_EVIDENCE_POLICY_ENFORCED === 'true';
}

function validPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function validPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function hasRealStopDistribution(sd) {
  if (!sd || typeof sd !== 'object' || Array.isArray(sd)) return false;
  const entries = Object.entries(sd);
  if (!entries.length) return false;
  return entries.every(([key, value]) => /^\d+$/.test(String(key)) && Number.isInteger(Number(value)) && Number(value) >= 0)
    && entries.some(([, value]) => Number(value) > 0);
}

// [SEO-GSC-COMPOUND-EVIDENCE] GSC shows a long tail of route URLs receiving
// impressions without meaningful ranking. A carrier count by itself is a
// weak freshness/route-quality signal and can survive after the richer route
// evidence has gone stale. Keep duration, stops, verified price sampling and
// observed itineraries independently sufficient, but require a second genuine
// signal when airline_count is the only available flight evidence. This is a
// fail-closed quality gate for thin route pages, not a ranking manipulation.
function hasVerifiedFlightEvidence(r) {
  if (!r) return false;
  const hasAirlines = validPositiveInteger(r.airline_count);
  const hasDuration = validPositiveNumber(r.avg_duration_min);
  const hasStops = hasRealStopDistribution(r.stop_distribution);
  const hasPrices = validPositiveInteger(r.price_sample_count);
  const hasItineraries = validPositiveInteger(r.itinerary_count);

  if (hasDuration || hasStops || hasPrices || hasItineraries) return true;
  return hasAirlines && false;
}

function hasManualEditorialContent(r) {
  return !!(r && (r.intro_text || (r.custom_faq && r.custom_faq.length)));
}

function hasLegacyRouteData(r) {
  return validPositiveNumber(r && r.distance_km)
    || validPositiveNumber(r && r.avg_duration_min)
    || validPositiveInteger(r && r.airline_count)
    || hasRealStopDistribution(r && r.stop_distribution);
}

function getRouteIndexabilityDecision(r, opts = {}) {
  const enforce = opts.enforce != null ? opts.enforce : evidencePolicyEnforced();
  const evidence = hasVerifiedFlightEvidence(r);
  const manual = hasManualEditorialContent(r);
  const indexable = enforce ? (evidence || manual) : (hasLegacyRouteData(r) || manual);
  const reason = enforce
    ? (evidence ? 'VERIFIED FLIGHT EVIDENCE' : (manual ? 'MANUAL EDITORIAL CONTENT' : 'NO VERIFIED FLIGHT EVIDENCE'))
    : (indexable ? 'LEGACY DATA/CONTENT' : 'NO DATA (legacy)');
  return {
    indexable,
    verifiedEvidence: evidence,
    manualContent: manual,
    enforce,
    reason,
    signals: {
      airline_count: r ? r.airline_count : null,
      avg_duration_min: r ? r.avg_duration_min : null,
      has_stop_distribution: hasRealStopDistribution(r && r.stop_distribution),
      price_sample_count: r ? r.price_sample_count : null,
      itinerary_count: r ? r.itinerary_count : null,
      distance_km: r ? r.distance_km : null,
    },
  };
}

module.exports = {
  evidencePolicyEnforced,
  hasVerifiedFlightEvidence,
  hasManualEditorialContent,
  getRouteIndexabilityDecision,
  hasLegacyRouteData,
};
