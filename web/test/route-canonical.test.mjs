// P0-28 — exact-duplicate route consolidation. Pins the slug-only winner rule
// (shared by the renderer and the sitemap builder so they never disagree) and
// the renderer's canonical/hreflang override for a loser slug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pickCanonicalSlug, buildCanonicalSlugMap } from '../lib/seo/route-canonical.mjs';

// ─── winner rule ───────────────────────────────────────────────────────────
test('pickCanonicalSlug prefers the city-name slug over the IATA-pair slug', () => {
  assert.equal(pickCanonicalSlug(['ams-vie', 'amsterdam-vienna']), 'amsterdam-vienna');
  assert.equal(pickCanonicalSlug(['xfw-ber', 'hamburg-berlin']), 'hamburg-berlin');
});

test('pickCanonicalSlug is deterministic (alphabetical) regardless of input order', () => {
  assert.equal(pickCanonicalSlug(['amsterdam-vienna', 'ams-vie']), 'amsterdam-vienna');
  assert.equal(pickCanonicalSlug(['b-city', 'a-city']), 'a-city'); // both city-name → alphabetical
  assert.equal(pickCanonicalSlug(['zzz-aaa', 'aaa-zzz']), 'aaa-zzz'); // both IATA → alphabetical
});

// ─── loser → winner map ────────────────────────────────────────────────────
test('maps a loser to the winner only for EXACT duplicates (same airport pair)', () => {
  const m = buildCanonicalSlugMap([
    { slug: 'ams-vie', origin_iata: 'AMS', destination_iata: 'VIE' },
    { slug: 'amsterdam-vienna', origin_iata: 'AMS', destination_iata: 'VIE' },
    { slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC' },
  ]);
  assert.equal(m.get('ams-vie'), 'amsterdam-vienna');
  assert.equal(m.get('amsterdam-vienna'), undefined, 'the winner is its own canonical');
  assert.equal(m.get('ber-muc'), undefined, 'a unique route is untouched');
});

test('DIFFERENT airports sharing a city title are NOT consolidated', () => {
  // Abu Dhabi→London via two different London airports — distinct routes.
  const m = buildCanonicalSlugMap([
    { slug: 'auh-lgw', origin_iata: 'AUH', destination_iata: 'LGW' },
    { slug: 'auh-lhr', origin_iata: 'AUH', destination_iata: 'LHR' },
  ]);
  assert.equal(m.size, 0);
});

test('accepts the sitemap-feed shape { id, o, d } too', () => {
  const m = buildCanonicalSlugMap([
    { id: 'fra-ber', o: 'FRA', d: 'BER' },
    { id: 'frankfurt-berlin', o: 'FRA', d: 'BER' },
  ]);
  assert.equal(m.get('fra-ber'), 'frankfurt-berlin');
});

test('rows missing a slug or IATA code are skipped safely', () => {
  const m = buildCanonicalSlugMap([
    { slug: 'x', origin_iata: 'AMS' }, // no destination
    { slug: 'amsterdam-vienna', origin_iata: 'AMS', destination_iata: 'VIE' },
    { origin_iata: 'AMS', destination_iata: 'VIE' }, // no slug
  ]);
  assert.equal(m.size, 0);
});

// ─── renderability guard (never 301 → 404) ─────────────────────────────────
// A canonical winner MUST be a slug the route DETAIL endpoint can serve. List-
// feed membership is not proof of that (a list row can have no servable detail),
// so an optional isRenderable predicate filters candidates before a winner is
// picked. These pin the guarantee: the map can never map a loser to a non-
// renderable winner — the exact defect that made a ranking page 301 into a 404.
test('winner selection skips a non-renderable preferred (city-name) slug', () => {
  // City-name slug is preferred by the slug-only rule but does NOT render;
  // the renderable IATA slug must win instead — never a 301 → 404.
  const renderable = new Set(['ams-vie']); // amsterdam-vienna is a dead list-only row
  assert.equal(
    pickCanonicalSlug(['ams-vie', 'amsterdam-vienna'], (s) => renderable.has(s)),
    'ams-vie',
  );
});

test('buildCanonicalSlugMap never maps a loser to a non-renderable winner', () => {
  const rows = [
    { slug: 'ams-vie', origin_iata: 'AMS', destination_iata: 'VIE' }, // renders
    { slug: 'amsterdam-vienna', origin_iata: 'AMS', destination_iata: 'VIE' }, // dead list-only row
  ];
  const renderable = new Set(['ams-vie']);
  const m = buildCanonicalSlugMap(rows, (s) => renderable.has(s));
  // The dead city-name slug is a loser now, redirecting to the renderable IATA winner.
  assert.equal(m.get('amsterdam-vienna'), 'ams-vie');
  // And the target is guaranteed renderable — the core invariant.
  for (const winner of m.values()) assert.ok(renderable.has(winner), `winner ${winner} must render`);
});

test('a pair with NO renderable slug is dropped entirely (no redirect at all)', () => {
  const rows = [
    { slug: 'aaa-bbb', origin_iata: 'AAA', destination_iata: 'BBB' },
    { slug: 'ghost-city', origin_iata: 'AAA', destination_iata: 'BBB' },
  ];
  const m = buildCanonicalSlugMap(rows, () => false); // nothing renders
  assert.equal(m.size, 0, 'no consolidation when no slug in the pair renders');
});

test('with no predicate the winner rule is unchanged (sitemap parity preserved)', () => {
  const rows = [
    { slug: 'fra-ber', origin_iata: 'FRA', destination_iata: 'BER' },
    { slug: 'frankfurt-berlin', origin_iata: 'FRA', destination_iata: 'BER' },
  ];
  assert.equal(buildCanonicalSlugMap(rows).get('fra-ber'), 'frankfurt-berlin');
});

// ─── renderer override ─────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
setGeoData(
  [{ city_slug: 'amsterdam', airport_codes: ['AMS'], translations: { de: 'Amsterdam', en: 'Amsterdam' } },
    { city_slug: 'wien', airport_codes: ['VIE'], translations: { de: 'Wien', en: 'Vienna' } }],
  [{ code: 'NL', translations: { de: 'Niederlande', en: 'Netherlands' } },
    { code: 'AT', translations: { de: 'Österreich', en: 'Austria' } }],
);
const route = (over) => Object.assign({
  origin_iata: 'AMS', destination_iata: 'VIE', origin_city: 'Amsterdam', destination_city: 'Wien',
  origin_city_slug: 'amsterdam', destination_city_slug: 'wien', origin_country: 'NL', destination_country: 'AT',
  distance_km: 1000, airline_count: 3,
}, over);
const canonical = (h) => (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];

test('a loser route renders canonical + hreflang pointing at the winner, in every language', () => {
  const { html } = renderFlightRoutePage(route({ slug: 'ams-vie', canonicalSlug: 'amsterdam-vienna' }), 'en', [], [], []);
  assert.equal(canonical(html), 'https://airpiv.com/en/flights/amsterdam-vienna');
  assert.ok(html.includes('hreflang="de" href="https://airpiv.com/flights/amsterdam-vienna"'));
  assert.ok(!html.includes('flights/ams-vie'), 'the duplicate slug must not appear in canonical/hreflang');
});

// ─── F1 redirect safety: single hop, no chains/loops ───────────────────────
test('no winner is itself a loser — the F1 301 is always a single hop (no chains)', () => {
  const m = buildCanonicalSlugMap([
    { slug: 'ams-vie', origin_iata: 'AMS', destination_iata: 'VIE' },
    { slug: 'amsterdam-vienna', origin_iata: 'AMS', destination_iata: 'VIE' },
    { slug: 'fra-ber', origin_iata: 'FRA', destination_iata: 'BER' },
    { slug: 'frankfurt-berlin', origin_iata: 'FRA', destination_iata: 'BER' },
  ]);
  for (const winner of m.values()) {
    assert.equal(m.has(winner), false, `winner ${winner} must not also be a redirect source`);
  }
  // and no self-loop: a slug never redirects to itself
  for (const [loser, winner] of m) assert.notEqual(loser, winner);
});

test('the winner (no canonicalSlug) still self-canonicals', () => {
  const { html } = renderFlightRoutePage(route({ slug: 'amsterdam-vienna' }), 'en', [], [], []);
  assert.equal(canonical(html), 'https://airpiv.com/en/flights/amsterdam-vienna');
});
