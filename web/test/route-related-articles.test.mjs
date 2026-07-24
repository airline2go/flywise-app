// Tests the route page's "related articles" section + the enriched Flight
// schema (flightDistance / estimatedFlightDuration). Exercises the real render
// path (setGeoData + renderFlightRoutePage), like render-seo-guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
  ],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);

const routeRow = (over) => Object.assign(
  {
    slug: 'txl-muc', origin_iata: 'TXL', destination_iata: 'MUC',
    origin_city: 'Berlin', destination_city: 'München',
    origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
    origin_country: 'DE', destination_country: 'DE',
  },
  over || {},
);

const emptyLinks = { fromOrigin: [], toDestination: [] };
const articles = [{ slug: 'billige-fluege-nach-muenchen', title: 'Billige Flüge nach München' }];

test('renders a related-articles section linking the matched blog post', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], emptyLinks, articles);
  assert.match(html, /Passende Artikel/);
  assert.match(html, /href="\/blog\/billige-fluege-nach-muenchen"/);
  assert.match(html, /Billige Flüge nach München/);
  // …and the matching ItemList JSON-LD.
  assert.match(html, /"@type":"ItemList"[^}]*"name":"Passende Artikel"/);
});

test('non-default language uses the prefixed blog path', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'en', [], emptyLinks, [{ slug: 'cheap-flights-to-munich', title: 'Cheap flights to Munich' }]);
  assert.match(html, /href="\/en\/blog\/cheap-flights-to-munich"/);
});

test('no related articles → no section and no articles ItemList', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], emptyLinks, []);
  assert.doesNotMatch(html, /Passende Artikel/);
});

test('Flight schema carries real flightDistance + ISO-8601 estimatedFlightDuration', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, avg_duration_min: 90, haul_type: 'short-haul' }), 'de', [], emptyLinks, []);
  assert.match(html, /"@type":"Flight"/);
  assert.match(html, /"flightDistance":"480 km"/);
  assert.match(html, /"estimatedFlightDuration":"PT1H30M"/);
});

test('Flight schema omits distance/duration when the data is absent', () => {
  const { html } = renderFlightRoutePage(routeRow({ intro_text: 'Manuelle Einleitung.' }), 'de', [], emptyLinks, []);
  assert.doesNotMatch(html, /flightDistance/);
  assert.doesNotMatch(html, /estimatedFlightDuration/);
});
