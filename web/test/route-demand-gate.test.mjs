// [SEO-ROUTE-DEMAND-GATE] Frontend mirror of the backend strong-prune switch.
// Production honors the API `indexable` flag, so this only guards the offline/
// fixture fallback — but the mirror must stay identical in intent to
// flywise-server/src/services/indexability.js. Default OFF (no behaviour change).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getRouteIndexabilityDecision, hasRouteDemandSignal } = require('../lib/legacy-render/route-evidence.js');

const EVIDENCE = Object.freeze({
  avg_duration_min: 120,
  stop_distribution: { 0: 3, 1: 1 },
  price_sample_count: 5,
  itinerary_count: 8,
});

test('demand gate defaults OFF: evidence-only route stays indexable', () => {
  assert.equal(getRouteIndexabilityDecision(EVIDENCE).indexable, true);
});

test('gate ON prunes an evidence-only, no-demand route', () => {
  const d = getRouteIndexabilityDecision(EVIDENCE, { demandGate: true });
  assert.equal(d.indexable, false);
  assert.equal(d.reason, 'NO DEMAND SIGNAL (pruned)');
});

test('gate ON keeps a route with a real popularity score or weekly flights', () => {
  assert.equal(getRouteIndexabilityDecision({ ...EVIDENCE, route_score: 1.5 }, { demandGate: true }).indexable, true);
  assert.equal(getRouteIndexabilityDecision({ ...EVIDENCE, weekly_flights: 7 }, { demandGate: true }).indexable, true);
});

test('gate ON never prunes manual editorial content', () => {
  assert.equal(getRouteIndexabilityDecision({ intro_text: 'Guide.' }, { demandGate: true }).indexable, true);
});

test('gate never applies in legacy (non-enforced) mode', () => {
  assert.equal(getRouteIndexabilityDecision({ distance_km: 1000 }, { enforce: false, demandGate: true }).indexable, true);
});

test('score threshold default is 0.2', () => {
  assert.equal(hasRouteDemandSignal({ route_score: 0.1 }), false);
  assert.equal(hasRouteDemandSignal({ route_score: 0.2 }), true);
});
