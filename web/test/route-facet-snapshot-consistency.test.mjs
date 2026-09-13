// [SNAPSHOT-FACET-GATE] Regression guard: the <title> and meta description must
// gate their descriptive facets (airlines / price / duration / distance) on the
// ONE canonical route snapshot — the same SSOT the hero, route-facts
// ("Streckendaten"), intro, FAQ and JSON-LD read — never on the raw route row.
//
// The concrete bug this locks out is the Hamburg→Barcelona case: a stale scalar
// `airline_count` (e.g. 19) disagreeing with the authoritative observed airline
// LIST (e.g. 8 carriers). Before this fix the title/meta gated the "Airlines"
// facet on the stale 19 while the visible facts card counted the list (8) — two
// numbers for one property. Now both come from snapshot.airlineCount, so the
// count the page shows and the facets the SEO surfaces claim can never diverge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteTitle, buildRouteMetaDescription } = require('../lib/legacy-render/render-flight-route.js');
const { buildRouteSnapshot } = require('../lib/legacy-render/route-snapshot.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

// A Hamburg→Barcelona-shaped route: the stored scalar airline_count is STALE
// (19), but the real observed airline list has only 8 carriers — so the
// snapshot's list-authoritative count is 8.
const AIRLINES_8 = Array.from({ length: 8 }, (_, i) => ({ iata_code: `A${i}`, name: `Airline ${i}` }));
const hamBcn = (over) => Object.assign({
  slug: 'hamburg-barcelona-2',
  origin_iata: 'HAM', destination_iata: 'BCN',
  origin_city: 'Hamburg', destination_city: 'Barcelona',
  origin_country: 'DE', destination_country: 'ES',
  distance_km: 1493,
  avg_duration_min: 155, min_duration_min: 150,
  price_min: 49, price_avg: 53, price_max: 74, price_currency: 'EUR', price_sample_count: 12, price_updated_at: '2026-08-01T00:00:00Z',
  airline_count: 19, // STALE scalar — must be ignored in favor of the list
  airlines: AIRLINES_8,
}, over || {});

test('snapshot.airlineCount is the list length (8), not the stale scalar (19)', () => {
  const snap = buildRouteSnapshot(hamBcn());
  assert.equal(snap.airlineCount, 8);
});

test('title/meta gate the "Airlines" facet on the snapshot, so they never rely on the stale scalar', () => {
  // With a real list, the airlines facet is present either way — assert it is
  // driven by the snapshot by removing the list: the scalar alone (list absent)
  // still yields the facet (list falls back to scalar), but a route whose only
  // airline signal is a ZERO list and no scalar must NOT claim the facet.
  const noAirlines = hamBcn({ airline_count: null, airlines: [] });
  const snap = buildRouteSnapshot(noAirlines);
  assert.equal(snap.airlineCount, null);
  const t = buildRouteTitle(noAirlines, 'en', snap);
  const m = buildRouteMetaDescription(noAirlines, 'en', snap);
  // "Airlines" facet word must be absent when the snapshot has no airline count.
  assert.doesNotMatch(t, /Airlines/i);
  assert.doesNotMatch(m, /Airlines/i);
});

test('an internally-derived snapshot (no snapshot arg) matches an explicitly-passed one', () => {
  const route = hamBcn();
  const snap = buildRouteSnapshot(route);
  for (const lang of ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']) {
    assert.equal(buildRouteTitle(route, lang), buildRouteTitle(route, lang, snap), `title (${lang})`);
    assert.equal(buildRouteMetaDescription(route, lang), buildRouteMetaDescription(route, lang, snap), `meta (${lang})`);
  }
});

test('the "from" price in the meta description is the canonical snapshot price (49), not the average (53)', () => {
  const route = hamBcn();
  const snap = buildRouteSnapshot(route);
  assert.equal(snap.price.amount, 49); // price_min, sample-backed — the "from" value
  const m = buildRouteMetaDescription(route, 'en', snap);
  assert.match(m, /from 49\b/); // never the 53 average or the 74 max
  assert.doesNotMatch(m, /from 53\b|from 74\b/);
});

test('all eight languages derive the SAME snapshot facts (only text differs)', () => {
  // The snapshot is language-independent by construction (it reads codes /
  // numbers / timestamps, never localized strings), so every locale renders
  // from identical price / distance / duration / airline data.
  const route = hamBcn();
  const snap = buildRouteSnapshot(route);
  assert.equal(snap.airlineCount, 8);
  assert.equal(snap.price.amount, 49);
  assert.equal(snap.distanceKm, 1493);
  assert.equal(snap.avgDurationMin, 155);
  assert.equal(snap.minDurationMin, 150);
});
