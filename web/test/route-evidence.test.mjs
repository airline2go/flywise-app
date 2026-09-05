// Parity tests for the frontend mirror of the canonical route-evidence policy
// (lib/legacy-render/route-evidence.js). Iterates the SHARED fixture that the
// backend test also iterates (test/fixtures/route-evidence-cases.json, kept
// byte-identical across both repos) so backend indexability, sitemap
// eligibility, and this renderer's <meta robots> can never drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { getRouteIndexabilityDecision, hasVerifiedFlightEvidence } = require('../lib/legacy-render/route-evidence.js');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/route-evidence-cases.json', import.meta.url)));

test('distance_km alone is NEVER evidence; airline_count=0 is NEVER evidence', () => {
  assert.equal(hasVerifiedFlightEvidence({ distance_km: 9438 }), false);
  assert.equal(hasVerifiedFlightEvidence({ airline_count: 0, distance_km: 500 }), false);
});

for (const c of fixture.cases) {
  test(`enforced parity: ${c.name} → ${c.enforced}`, () => {
    assert.equal(getRouteIndexabilityDecision(c.route, { enforce: true }).indexable, c.enforced);
  });
  test(`legacy parity: ${c.name} → ${c.legacy}`, () => {
    assert.equal(getRouteIndexabilityDecision(c.route, { enforce: false }).indexable, c.legacy);
  });
}
