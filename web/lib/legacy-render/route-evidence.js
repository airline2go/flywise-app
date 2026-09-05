// ═══════════════════════════════════════════════════════════════════════
// web/lib/legacy-render/route-evidence.js
// ─────────────────────────────────────────────────────────────────────────
// FRONTEND MIRROR of the backend canonical policy in
// flywise-server/src/services/indexability.js. The two files must stay
// byte-for-byte identical IN INTENT: a route's indexability decision has ONE
// definition, and both the backend (sitemap / indexable flag / connectivity)
// and this renderer must reach the same verdict for the same route.
//
// Parity is asserted by a shared fixture set (see the *-evidence tests in both
// repos). Do NOT fork this logic — change both sides together.
//
// distance_km is NEVER flight evidence. airline_count = 0 is NEVER evidence.
// Only a genuine flight-data signal — observed carriers, a real duration, a
// real stop distribution, verified price sampling, or observed itineraries —
// or approved manual editorial content makes a route indexable.
// ═══════════════════════════════════════════════════════════════════════

function evidencePolicyEnforced() {
  return process.env.SEO_EVIDENCE_POLICY_ENFORCED === '1'
    || process.env.SEO_EVIDENCE_POLICY_ENFORCED === 'true';
}

function hasRealStopDistribution(sd) {
  if (!sd || typeof sd !== 'object') return false;
  return Object.keys(sd).length > 0;
}

function hasVerifiedFlightEvidence(r) {
  if (!r) return false;
  if (r.airline_count != null && r.airline_count > 0) return true;
  if (r.avg_duration_min != null && r.avg_duration_min > 0) return true;
  if (hasRealStopDistribution(r.stop_distribution)) return true;
  if (r.price_sample_count != null && r.price_sample_count > 0) return true;
  if (r.itinerary_count != null && r.itinerary_count > 0) return true;
  return false;
}

function hasManualEditorialContent(r) {
  return !!(r && (r.intro_text || (r.custom_faq && r.custom_faq.length)));
}

function hasLegacyRouteData(r) {
  return r.distance_km != null
    || r.avg_duration_min != null
    || (r.airline_count != null && r.airline_count > 0)
    || hasRealStopDistribution(r.stop_distribution);
}

function getRouteIndexabilityDecision(r, opts = {}) {
  const enforce = opts.enforce != null ? opts.enforce : evidencePolicyEnforced();
  const evidence = hasVerifiedFlightEvidence(r);
  const manual = hasManualEditorialContent(r);
  let indexable;
  let reason;
  if (enforce) {
    indexable = evidence || manual;
    reason = evidence
      ? 'VERIFIED FLIGHT EVIDENCE'
      : (manual ? 'MANUAL EDITORIAL CONTENT' : 'NO VERIFIED FLIGHT EVIDENCE');
  } else {
    indexable = hasLegacyRouteData(r) || manual;
    reason = indexable ? 'LEGACY DATA/CONTENT' : 'NO DATA (legacy)';
  }
  return { indexable, verifiedEvidence: evidence, manualContent: manual, enforce, reason };
}

module.exports = {
  evidencePolicyEnforced,
  hasVerifiedFlightEvidence,
  hasManualEditorialContent,
  getRouteIndexabilityDecision,
};
