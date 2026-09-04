// P2-27 — every application/ld+json block a RENDERED template emits must be
// valid JSON. static-jsonld.test.mjs covers the static public/*.html pages;
// this covers the dynamic server-rendered pages (route / city / country /
// airport / airline / blog), so a malformed structured-data block on any page
// type fails CI instead of silently dropping the page's structured data (the
// dynamic-page counterpart of the /blog.html finding fixed in P0-27).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderCityPage } = require('../lib/legacy-render/render-city.js');
const { renderCountryPage } = require('../lib/legacy-render/render-country.js');
const { renderAirportPage } = require('../lib/legacy-render/render-airport.js');
const { renderAirlinePage } = require('../lib/legacy-render/render-airline.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { renderBlogPostPage } = require('../lib/legacy-render/render-blog-post.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', country_code: 'DE', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
    { city_slug: 'paris', name: 'Paris', country_code: 'FR', airport_codes: ['CDG'], translations: { de: 'Paris', en: 'Paris' } },
  ],
  [
    { code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'FR', translations: { de: 'Frankreich', en: 'France' } },
  ],
);

const routeRow = (over) => Object.assign({
  slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC',
  origin_city: 'Berlin', destination_city: 'München',
  origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
  origin_country: 'DE', destination_country: 'DE',
  distance_km: 500, haul_type: 'short-haul', airline_count: 3, route_score: 60,
  updated_at: '2026-08-01T00:00:00Z',
}, over || {});

const routes = [
  routeRow({ slug: 'ber-muc' }),
  routeRow({ slug: 'ber-cdg', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' }),
];

// Extract every JSON-LD block and assert each is valid, non-empty JSON.
function assertJsonLdValid(html, label) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  assert.ok(blocks.length >= 1, `${label}: expected at least one JSON-LD block`);
  blocks.forEach((body, i) => {
    assert.ok(body.length > 0, `${label}: JSON-LD block #${i + 1} is empty`);
    assert.doesNotThrow(() => JSON.parse(body), `${label}: JSON-LD block #${i + 1} is invalid JSON`);
  });
}

test('flight-route page emits only valid JSON-LD', () => {
  const { html } = renderFlightRoutePage(routeRow(), 'en', [], [], []);
  assertJsonLdValid(html, 'flight-route');
});

test('city page emits only valid JSON-LD', () => {
  const city = { city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'], updated_at: '2026-08-01T00:00:00Z' };
  const { html } = renderCityPage(city, routes, 'de', {});
  assertJsonLdValid(html, 'city');
});

test('country page emits only valid JSON-LD', () => {
  const country = { code: 'DE', name: 'Deutschland' };
  const { html } = renderCountryPage(country, routes, 'de', {});
  assertJsonLdValid(html, 'country');
});

test('airport page emits only valid JSON-LD', () => {
  const airport = { code: 'BER', iata_code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country_code: 'DE' };
  const { html } = renderAirportPage(airport, routes, 'de', {});
  assertJsonLdValid(html, 'airport');
});

test('airline page emits only valid JSON-LD', () => {
  const airline = { code: 'LH', iata_code: 'LH', name: 'Lufthansa' };
  const { html } = renderAirlinePage(airline, routes, 'de', [], {});
  assertJsonLdValid(html, 'airline');
});

test('blog-post page emits only valid JSON-LD (incl. a non-de language)', () => {
  const post = { slug: 'roma-milano', title: 'Roma-Milano', content: '<p>Contenuto sufficientemente lungo per il test.</p>', published_at: '2026-08-08T00:00:00Z' };
  for (const lang of ['de', 'it']) {
    const { html } = renderBlogPostPage(post, routes, [], lang);
    assertJsonLdValid(html, `blog-post/${lang}`);
  }
});
