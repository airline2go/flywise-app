// [P0.7 SINGLE-SOURCE-OF-TRUTH] The flight-route renderer must honor the
// `indexable` verdict the backend attaches (route-pages/:slug and the list feed
// both send it), so the evidence policy is decided in ONE place — the server —
// and the frontend mirror stays fail-closed when the flag is absent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign({
  slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom',
  origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT',
  distance_km: 1297,
}, over || {});
const links = { fromOrigin: [], toDestination: [] };
const robotsOf = (html) => (html.match(/<meta name="robots" content="([^"]+)">/) || [])[1];

test('[P0.7] API indexable=false forces noindex,follow even with a distance present', () => {
  const { html } = renderFlightRoutePage(R({ indexable: false }), 'de', [], links, []);
  assert.equal(robotsOf(html), 'noindex, follow');
});

test('[P0.7] API indexable=true indexes even an otherwise-thin row', () => {
  const { html } = renderFlightRoutePage(R({ indexable: true, distance_km: null }), 'de', [], links, []);
  assert.equal(robotsOf(html), 'index, follow');
});

test('[P0.7] flag absent → fail-closed local decision blocks distance-only route', () => {
  const { html } = renderFlightRoutePage(R({}), 'de', [], links, []);
  assert.equal(robotsOf(html), 'noindex, follow');
});

test('[P0.7] API indexable=false still yields noindex when admin content exists (verdict already accounts for it)', () => {
  const { html } = renderFlightRoutePage(R({ indexable: false, intro_text: '' }), 'de', [], links, []);
  assert.equal(robotsOf(html), 'noindex, follow');
});
