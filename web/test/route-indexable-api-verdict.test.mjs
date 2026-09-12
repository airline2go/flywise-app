// [P0.7 SINGLE-SOURCE-OF-TRUTH] The flight-route renderer must honor the
// `indexable` verdict the backend attaches (route-pages/:slug and the list feed
// both send it), so the evidence policy (SEO_EVIDENCE_POLICY_ENFORCED) is
// decided in ONE place — the server — and this static frontend needs no policy
// env of its own. These pin:
//   • route.indexable === false → <meta robots> is noindex,follow EVEN when the
//     row carries a distance (the legacy "distance is data" signal), i.e. the
//     enforced-policy outcome, driven purely by the API flag.
//   • route.indexable === true  → indexed, even for an otherwise thin row.
//   • flag absent → fall back to the local decision (prior behaviour, so every
//     existing fixture/test is unaffected).
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
  distance_km: 1297, // legacy "data" — would index under the old rule
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

test('[P0.7] flag absent → local decision stands (legacy distance-as-data → index)', () => {
  const { html } = renderFlightRoutePage(R({}), 'de', [], links, []);
  // default policy (unenforced) counts distance as data → indexable
  assert.equal(robotsOf(html), 'index, follow');
});

test('[P0.7] API indexable=false still yields noindex when admin content exists (verdict already accounts for it)', () => {
  // The backend verdict already treats manual editorial content as indexable;
  // a false verdict means neither evidence nor manual content — honor it.
  const { html } = renderFlightRoutePage(R({ indexable: false, intro_text: '' }), 'de', [], links, []);
  assert.equal(robotsOf(html), 'noindex, follow');
});
