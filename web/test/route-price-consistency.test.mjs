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

test('when aggregate-min and cached price DISAGREE, every surface shows the aggregate min', () => {
  const over = { price_min: 60, price_avg: 90, price_max: 120, price_currency: 'EUR', price_sample_count: 9, price_updated_at: '2026-07-20T00:00:00Z', cached_price: 83, cached_currency: 'EUR' };
  const { html, seo } = render(over);
  const cp = resolveCanonicalPrice(R(over));
  assert.equal(cp.amount, 60);
  assert.equal(cp.source, 'aggregate-min');
  assert.match(seo.description, /ab 60 €/);
  assert.doesNotMatch(seo.description, /83/);
  assert.match(html, /var CANON_PRICE = 60;/);
  assert.match(html, /var CANON_DATE = "2026-07-20";/);
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

test('with only a cached price (no persisted aggregate), title/meta/hero use it — and no Offer is emitted', () => {
  const over = { cached_price: 49, cached_currency: 'EUR', distance_km: 1297 };
  const { html, seo } = render(over);
  const cp = resolveCanonicalPrice(R(over));
  assert.equal(cp.amount, 49);
  assert.equal(cp.source, 'cached');
  assert.equal(cp.checkedAt, null);
  assert.match(seo.title, /Preise/);
  assert.match(seo.description, /ab 49 €/);
  assert.match(html, /var CANON_PRICE = 49;/);
  assert.match(html, /var CANON_DATE = null;/);
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

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
  assert.equal(resolveCanonicalPrice(R({ price_min: 60, price_sample_count: 0 })), null);
});

test('an observed aggregate min with one sample is preferred over cached price', () => {
  const cp = resolveCanonicalPrice(R({ price_min: 60, price_sample_count: 1, price_currency: 'EUR', cached_price: 83, cached_currency: 'EUR' }));
  assert.equal(cp.amount, 60);
  assert.equal(cp.source, 'aggregate-min');
});

test('currency is carried from the chosen source, not assumed EUR', () => {
  const gbp = resolveCanonicalPrice(R({ price_min: 40, price_sample_count: 1, price_currency: 'GBP' }));
  assert.equal(gbp.currency, 'GBP');
  assert.match(buildRouteMetaDescription(R({ price_min: 40, price_sample_count: 1, price_currency: 'GBP' }), 'en'), /from £40/);
});
