// [CANONICAL-PRICE-SOURCE] Phase 1 regression guard: the "from" price a route
// page advertises must come from ONE source and be identical across every
// surface — the <title> facet, the meta description, the hero box's canonical
// fallback (CANON_PRICE in the live script), and the JSON-LD Offer. This test
// exists to stop the old split (title/meta read cached_price while the hero and
// Offer read price_min) from ever coming back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage, buildRouteMetaDescription, resolveCanonicalPrice } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom', origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT' },
  over || {},
);
const links = { fromOrigin: [], toDestination: [] };
const render = (over, lang = 'de') => renderFlightRoutePage(R(over), lang, [], links, []);

// ─── The core invariant: one price, everywhere ─────────────────────────────
test('when aggregate-min and cached price DISAGREE, every surface shows the aggregate min', () => {
  // price_min (60, sample-backed) is the correct "from" value; cached_price (83)
  // is a different, timestamp-less figure. Before Phase 1 the title/meta would
  // advertise 83 while the hero fallback and Offer showed 60 — the exact
  // contradiction this guards against.
  const over = { price_min: 60, price_avg: 90, price_max: 120, price_currency: 'EUR', price_sample_count: 9, price_updated_at: '2026-07-20T00:00:00Z', cached_price: 83, cached_currency: 'EUR' };
  const { html, seo } = render(over);

  const cp = resolveCanonicalPrice(R(over));
  assert.equal(cp.amount, 60);
  assert.equal(cp.source, 'aggregate-min');

  // Meta description "from" clause = 60, never 83.
  assert.match(seo.description, /ab 60 €/);
  assert.doesNotMatch(seo.description, /83/);

  // Hero canonical fallback baked into the live script = 60.
  assert.match(html, /var CANON_PRICE = 60;/);
  assert.match(html, /var CANON_DATE = "2026-07-20";/);

  // JSON-LD Offer = 60.00, matching the hero and meta.
  assert.match(html, /"price":"60\.00"/);
  assert.doesNotMatch(html, /"price":"83/);
});

test('with only a cached price (no sample-backed min), title/meta/hero use it — and no Offer is emitted', () => {
  const over = { cached_price: 49, cached_currency: 'EUR', distance_km: 1297 };
  const { html, seo } = render(over);
  const cp = resolveCanonicalPrice(R(over));
  assert.equal(cp.amount, 49);
  assert.equal(cp.source, 'cached');
  assert.equal(cp.checkedAt, null);

  assert.match(seo.title, /Preise/);              // title gains the price facet
  assert.match(seo.description, /ab 49 €/);        // meta "from" clause
  assert.match(html, /var CANON_PRICE = 49;/);     // hero fallback
  assert.match(html, /var CANON_DATE = null;/);    // no timestamp → never "live"
  // No sample-backed aggregate → no structured-data Offer (quality bar unmet),
  // rather than a fabricated-quality Offer from the timestamp-less cached value.
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

// ─── Edge cases (Phase 1.13 / 1.14) ────────────────────────────────────────
test('no price anywhere → null resolver, no price surfaces, explicit unavailable state', () => {
  const over = {};
  assert.equal(resolveCanonicalPrice(R(over)), null);
  const { html, seo } = render(over);
  assert.doesNotMatch(seo.description, /ab \d|from \d/);
  assert.match(html, /var CANON_PRICE = null;/);
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

test('zero, negative and malformed prices are rejected — never advertised, never invented', () => {
  assert.equal(resolveCanonicalPrice(R({ cached_price: 0 })), null);
  assert.equal(resolveCanonicalPrice(R({ cached_price: -5 })), null);
  assert.equal(resolveCanonicalPrice(R({ price_min: 0, price_sample_count: 9 })), null);
  assert.equal(resolveCanonicalPrice(R({ price_min: -10, price_sample_count: 9 })), null);
  // A sample-backed min below the quality bar is ignored (falls through to cached, here absent).
  assert.equal(resolveCanonicalPrice(R({ price_min: 60, price_sample_count: 2 })), null);
});

test('a below-threshold aggregate min falls back to the cached price, not the unqualified min', () => {
  const cp = resolveCanonicalPrice(R({ price_min: 60, price_sample_count: 2, cached_price: 83, cached_currency: 'EUR' }));
  assert.equal(cp.amount, 83);
  assert.equal(cp.source, 'cached');
});

test('currency is carried from the chosen source, not assumed EUR', () => {
  const gbp = resolveCanonicalPrice(R({ price_min: 40, price_sample_count: 5, price_currency: 'GBP' }));
  assert.equal(gbp.currency, 'GBP');
  assert.match(buildRouteMetaDescription(R({ price_min: 40, price_sample_count: 5, price_currency: 'GBP' }), 'en'), /from £40/);
});
