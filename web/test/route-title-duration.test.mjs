// [P2.1 DATA-TRUTH] A route <title> must never claim a flight time (or, in
// Arabic, airlines) that the route data doesn't back up. A distance-only route
// (distance_km present, no observed duration) previously got the "Flight Time &
// Distance" facts title — distance alone is NOT flight-time evidence (same rule
// as P0.1). It now falls back to a distance-only title that names neither.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom', origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT' },
  over || {},
);
const links = { fromOrigin: [], toDestination: [] };
const titleFor = (over, lang) => renderFlightRoutePage(R(over), lang, [], links, []).seo.title;

// German + English name a flight time in the facts title; Arabic named airlines.
const FLIGHT_TIME_CLAIMS = { de: 'Flugzeit', en: 'Flight Time' };
const DISTANCE_WORD = { de: 'Entfernung', en: 'Distance', ar: 'المسافة' };

test('distance-only route: title claims NO flight time, uses the distance-only title', () => {
  for (const lang of ['de', 'en']) {
    const t = titleFor({ distance_km: 1297 }, lang);
    assert.ok(!t.includes(FLIGHT_TIME_CLAIMS[lang]), `${lang} distance-only title must not claim flight time: ${t}`);
    assert.ok(t.includes(DISTANCE_WORD[lang]), `${lang} distance-only title should name distance: ${t}`);
  }
  // Arabic facts title had claimed airlines — the distance-only title must not.
  const ar = titleFor({ distance_km: 1297 }, 'ar');
  assert.ok(!ar.includes('شركات الطيران'), `ar distance-only title must not claim airlines: ${ar}`);
  assert.ok(ar.includes(DISTANCE_WORD.ar), `ar distance-only title should name distance: ${ar}`);
});

test('a route with a REAL observed duration keeps the Flight Time & Distance title', () => {
  const t = titleFor({ distance_km: 1297, avg_duration_min: 135 }, 'en');
  assert.ok(t.includes('Flight Time'), `real-duration title should claim flight time: ${t}`);
  assert.ok(t.includes('Distance'), t);
});

test('min_duration_min alone also counts as a real duration', () => {
  const t = titleFor({ distance_km: 1297, min_duration_min: 120 }, 'de');
  assert.ok(t.includes('Flugzeit'), t);
});

test('a route with neither distance nor duration falls back to the base title (no facet claims)', () => {
  const t = titleFor({}, 'en');
  assert.ok(!t.includes('Flight Time'), t);
  assert.ok(!t.includes('Distance'), t);
  assert.match(t, /Flights from Amsterdam to Rom \| Airpiv/);
});
