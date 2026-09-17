// [SEO-ROUTE-DEMAND-GATE] Frontend mirror of the backend strong-prune switch.
// Production honors the API `indexable` flag, so this only guards the offline/
// fixture fallback — but the mirror must stay identical in intent to
// flywise-server/src/services/indexability.js. Default OFF (no behaviour change).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getRouteIndexabilityDecision,
  hasRouteDemandSignal,
  routeDemandGateEnabled,
  routeMinScore,
} = require('../lib/legacy-render/route-evidence.js');

const EVIDENCE = Object.freeze({
  avg_duration_min: 120,
  stop_distribution: { 0: 3, 1: 1 },
  price_sample_count: 5,
  itinerary_count: 8,
});

test('demand gate defaults OFF: evidence-only route stays indexable', () => {
  const old = process.env.SEO_ROUTE_DEMAND_GATE;
  delete process.env.SEO_ROUTE_DEMAND_GATE;
  try {
    assert.equal(getRouteIndexabilityDecision(EVIDENCE).indexable, true);
    assert.equal(routeDemandGateEnabled(), false);
  } finally {
    if (old == null) delete process.env.SEO_ROUTE_DEMAND_GATE;
    else process.env.SEO_ROUTE_DEMAND_GATE = old;
  }
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

test('explicit backend noindex cannot be resurrected by local editorial content', () => {
  const d = getRouteIndexabilityDecision({ ...EVIDENCE, intro_text: 'Guide.', indexable: false }, { demandGate: true });
  assert.equal(d.indexable, false);
  assert.equal(d.manualContent, false);
  assert.equal(d.reason, 'EXPLICIT BACKEND NOINDEX VERDICT');
});

test('explicit backend indexable is honored even without local fallback evidence', () => {
  const d = getRouteIndexabilityDecision({ indexable: true }, { demandGate: true });
  assert.equal(d.indexable, true);
  assert.equal(d.manualContent, false);
  assert.equal(d.reason, 'EXPLICIT BACKEND INDEXABLE VERDICT');
});

test('gate never applies in legacy (non-enforced) mode', () => {
  assert.equal(getRouteIndexabilityDecision({ distance_km: 1000 }, { enforce: false, demandGate: true }).indexable, true);
});

test('score threshold defaults to 0.2 and honors SEO_ROUTE_MIN_SCORE', () => {
  const old = process.env.SEO_ROUTE_MIN_SCORE;
  try {
    delete process.env.SEO_ROUTE_MIN_SCORE;
    assert.equal(routeMinScore(), 0.2);
    assert.equal(hasRouteDemandSignal({ route_score: 0.1 }), false);
    assert.equal(hasRouteDemandSignal({ route_score: 0.2 }), true);

    process.env.SEO_ROUTE_MIN_SCORE = '0.5';
    assert.equal(routeMinScore(), 0.5);
    assert.equal(hasRouteDemandSignal({ route_score: 0.2 }), false);
    assert.equal(hasRouteDemandSignal({ route_score: 0.5 }), true);
  } finally {
    if (old == null) delete process.env.SEO_ROUTE_MIN_SCORE;
    else process.env.SEO_ROUTE_MIN_SCORE = old;
  }
});

test('SEO_ROUTE_DEMAND_GATE accepts 1/true and rejects 0', () => {
  const old = process.env.SEO_ROUTE_DEMAND_GATE;
  try {
    process.env.SEO_ROUTE_DEMAND_GATE = '1';
    assert.equal(routeDemandGateEnabled(), true);
    process.env.SEO_ROUTE_DEMAND_GATE = 'true';
    assert.equal(routeDemandGateEnabled(), true);
    process.env.SEO_ROUTE_DEMAND_GATE = '0';
    assert.equal(routeDemandGateEnabled(), false);
  } finally {
    if (old == null) delete process.env.SEO_ROUTE_DEMAND_GATE;
    else process.env.SEO_ROUTE_DEMAND_GATE = old;
  }
});
