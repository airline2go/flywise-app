// ═══════════════════════════════════════════════════════════════════════
// web/lib/legacy-render/route-evidence.js
// ─────────────────────────────────────────────────────────────────────────
// FRONTEND MIRROR of the backend canonical policy in
// flywise-server/src/services/indexability.js. The two files must stay
// identical IN INTENT: a route's indexability decision has ONE definition,
// and both the backend (sitemap / indexable flag / connectivity) and this
// renderer must reach the same verdict for the same route.
//
// The active recovery phase additionally exposes only a versioned 50-route
// core. The backend is authoritative in production; this mirror keeps the
// fallback fail-closed during partial deploys and offline/fixture renders.
// ═══════════════════════════════════════════════════════════════════════

const SEO_CORE_ROUTES = new Set([
  'london-athens', 'madrid-zuerich', 'hamburg-barcelona-2', 'duesseldorf-palma-de-mallorca',
  'ber-bud', 'lgw-pmi', 'ibiza-frankfurt', 'las-palmas-hamburg', 'paris-zuerich',
  'lisbon-barcelona', 'stockholm-paris', 'stockholm-frankfurt', 'barcelona-dublin',
  'ber-jfk', 'barcelona-frankfurt', 'berlin-athens', 'berlin-barcelona', 'berlin-amsterdam',
  'berlin-rome', 'berlin-lisbon', 'zuerich-amsterdam', 'madrid-berlin', 'berlin-istanbul',
  'barcelona-zuerich', 'palma-de-mallorca-hamburg', 'barcelona-amsterdam', 'malaga-paris',
  'copenhagen-berlin', 'istanbul-london', 'frankfurt-zuerich', 'paris-copenhagen',
  'zuerich-rome', 'zuerich-lisbon', 'auh-ath', 'auh-ber', 'zuerich-istanbul', 'ber-ord',
  'palma-de-mallorca-malaga', 'london-zuerich', 'barcelona-madrid', 'alicante-berlin',
  'muc-gva', 'malaga-munich', 'barcelona-paris', 'stockholm-zuerich', 'london-amsterdam',
  'frankfurt-berlin', 'tenerife-berlin', 'auh-prg',
]);

function seoCoreOnlyEnabled() {
  if (process.env.SEO_ROUTE_CORE_ONLY == null) return true;
  return process.env.SEO_ROUTE_CORE_ONLY === '1' || process.env.SEO_ROUTE_CORE_ONLY === 'true';
}

function isSeoCoreRoute(slug) {
  return typeof slug === 'string' && SEO_CORE_ROUTES.has(slug);
}

function evidencePolicyEnforced() {
  if (process.env.SEO_EVIDENCE_POLICY_ENFORCED == null) return true;
  return process.env.SEO_EVIDENCE_POLICY_ENFORCED === '1'
    || process.env.SEO_EVIDENCE_POLICY_ENFORCED === 'true';
}

// [SEO-ROUTE-DEMAND-GATE] Mirror of the backend strong-prune switch
// (flywise-server/src/services/indexability.js). Production honors the API's
// `indexable` verdict verbatim, so this only affects the offline/fixture
// fallback — but the two files must stay identical IN INTENT. Default OFF.
function routeDemandGateEnabled() {
  return process.env.SEO_ROUTE_DEMAND_GATE === '1'
    || process.env.SEO_ROUTE_DEMAND_GATE === 'true';
}

function routeMinScore() {
  const n = Number(process.env.SEO_ROUTE_MIN_SCORE);
  return Number.isFinite(n) && n >= 0 ? n : 0.2;
}

function routeDataMaxAgeMs() {
  const days = Number(process.env.SEO_ROUTE_DATA_MAX_AGE_DAYS);
  const effectiveDays = Number.isFinite(days) && days > 0 ? days : 30;
  return effectiveDays * 24 * 60 * 60 * 1000;
}

function hasFreshRouteData(r, now = Date.now()) {
  if (!r) return false;
  const raw = r.insights_updated_at
    || (r.intelligence && r.intelligence.operational && r.intelligence.operational.updatedAt);
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  const age = now - t;
  return age >= 0 && age <= routeDataMaxAgeMs();
}

function hasRouteDemandSignal(r) {
  if (!r) return false;
  if (validPositiveNumber(r.route_score) && Number(r.route_score) >= routeMinScore()) return true;
  if (validPositiveInteger(r.weekly_flights)) return true;
  return false;
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

function hasVerifiedFlightEvidence(r) {
  if (!r) return false;
  if (validPositiveNumber(r.avg_duration_min)) return true;
  if (hasRealStopDistribution(r.stop_distribution)) return true;
  if (validPositiveInteger(r.price_sample_count)) return true;
  if (validPositiveInteger(r.itinerary_count)) return true;
  return false;
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
  const demandGate = opts.demandGate != null ? opts.demandGate : routeDemandGateEnabled();
  const coreOnly = opts.coreOnly != null ? opts.coreOnly : seoCoreOnlyEnabled();
  const evidence = hasVerifiedFlightEvidence(r);
  const manual = hasManualEditorialContent(r);
  const demand = hasRouteDemandSignal(r);
  const fresh = hasFreshRouteData(r, opts.now);
  const freshnessOk = !demandGate || manual || fresh;
  const demandOk = !demandGate || manual || demand;
  const policyIndexable = enforce ? ((evidence || manual) && demandOk && freshnessOk) : (hasLegacyRouteData(r) || manual);

  const explicitIndexable = typeof r?.indexable === 'boolean' ? r.indexable : null;
  const baseVerdict = explicitIndexable != null ? explicitIndexable : policyIndexable;
  const coreOk = !coreOnly || !r?.slug || isSeoCoreRoute(r.slug);
  const indexable = baseVerdict && coreOk;
  const effectiveManual = explicitIndexable === false || !coreOk ? false : manual;
  const effectiveEvidence = explicitIndexable === false || !coreOk ? false : evidence;
  const reason = !coreOk
    ? 'OUTSIDE SEO CORE (pruned)'
    : explicitIndexable != null
      ? (explicitIndexable ? 'EXPLICIT BACKEND INDEXABLE VERDICT' : 'EXPLICIT BACKEND NOINDEX VERDICT')
      : (enforce
        ? ((evidence || manual)
          ? (demandOk
            ? (freshnessOk
              ? (evidence ? 'VERIFIED FLIGHT EVIDENCE' : 'MANUAL EDITORIAL CONTENT')
              : 'STALE ROUTE DATA (pruned)')
            : 'NO DEMAND SIGNAL (pruned)')
          : 'NO VERIFIED FLIGHT EVIDENCE')
        : (indexable ? 'LEGACY DATA/CONTENT' : 'NO DATA (legacy)'));

  return {
    indexable,
    verifiedEvidence: effectiveEvidence,
    manualContent: effectiveManual,
    demandSignal: demand,
    routeDataFresh: fresh,
    demandGate,
    coreOnly,
    inSeoCore: !r?.slug || isSeoCoreRoute(r.slug),
    enforce,
    reason,
    signals: {
      airline_count: r ? r.airline_count : null,
      avg_duration_min: r ? r.avg_duration_min : null,
      has_stop_distribution: hasRealStopDistribution(r && r.stop_distribution),
      price_sample_count: r ? r.price_sample_count : null,
      itinerary_count: r ? r.itinerary_count : null,
      distance_km: r ? r.distance_km : null,
      route_score: r ? r.route_score : null,
      weekly_flights: r ? r.weekly_flights : null,
      insights_updated_at: r ? r.insights_updated_at : null,
    },
  };
}

module.exports = {
  evidencePolicyEnforced,
  routeDemandGateEnabled,
  routeMinScore,
  routeDataMaxAgeMs,
  hasFreshRouteData,
  hasRouteDemandSignal,
  hasVerifiedFlightEvidence,
  hasManualEditorialContent,
  getRouteIndexabilityDecision,
  hasLegacyRouteData,
  seoCoreOnlyEnabled,
  isSeoCoreRoute,
  SEO_CORE_ROUTES,
};
