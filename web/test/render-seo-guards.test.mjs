// Regression tests for the SEO guards added to the legacy-render entity
// generators:
//   1. Thin-content `noindex, follow` on airport pages (was missing — only
//      city/country/airline had it) and on flight-route pages with no real
//      intelligence data and no admin-authored content.
//   2. Localized country NAME in the city/airport breadcrumb (visible link +
//      BreadcrumbList schema) instead of the raw country code ("Deutschland",
//      not "DE").
//
// The generators are CommonJS; createRequire loads them and setGeoData()
// exactly as lib/legacy-render/render.js does at runtime, so these exercise
// the real render path (no mocking of the render internals).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderCityPage } = require('../lib/legacy-render/render-city.js');
const { renderAirportPage } = require('../lib/legacy-render/render-airport.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

// Minimal geo lookup tables — enough for localizeCity/localizeCountry to
// resolve the fixtures below (they fall back to the raw value otherwise).
setGeoData(
  [
    { city_slug: 'berlin', airport_codes: ['BER', 'TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
    { city_slug: 'paris', airport_codes: ['CDG'], translations: { de: 'Paris', en: 'Paris' } },
  ],
  [
    { code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'FR', translations: { de: 'Frankreich', en: 'France' } },
  ],
);

const routeRow = (over) => Object.assign(
  {
    slug: 'txl-muc',
    origin_iata: 'TXL', destination_iata: 'MUC',
    origin_city: 'Berlin', destination_city: 'München',
    origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
    origin_country: 'DE', destination_country: 'DE',
  },
  over || {},
);

const robotsFrom = (html) => {
  const m = html.match(/<meta name="robots" content="([^"]+)">/);
  return m ? m[1] : null;
};

// ─── #9 Localized breadcrumb country name (city) ──────────────────────────
test('city breadcrumb uses the localized country name, not the raw code', () => {
  const city = { city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER', 'TXL'], updated_at: '2026-01-01T00:00:00Z' };
  const routes = [
    routeRow({ slug: 'ber-muc', origin_iata: 'BER' }),
    routeRow({ slug: 'ber-cdg', origin_iata: 'BER', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' }),
  ];
  const { html } = renderCityPage(city, routes, 'de', {});
  // Visible breadcrumb anchor shows the localized name…
  assert.match(html, />Deutschland<\/a>/, 'visible breadcrumb should read "Deutschland"');
  // …and so does the BreadcrumbList JSON-LD.
  assert.match(html, /"name":"Deutschland"/, 'breadcrumb schema should carry "Deutschland"');
  // The raw code must no longer be the visible breadcrumb label.
  assert.doesNotMatch(html, />DE<\/a>/, 'breadcrumb should not show the bare code "DE"');
});

// ─── #5 Airport thin-content noindex guard ────────────────────────────────
test('airport with a single destination and no admin info is noindex', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {} };
  const { html } = renderAirportPage(airport, [routeRow()], 'de', {});
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('airport with two or more destinations is indexed', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {} };
  const routes = [
    routeRow(),
    routeRow({ slug: 'txl-cdg', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' }),
  ];
  const { html } = renderAirportPage(airport, routes, 'de', {});
  assert.equal(robotsFrom(html), 'index, follow');
});

test('single-destination airport WITH admin traveler content is indexed', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {}, terminal_info: 'Terminal A und B, fußläufig verbunden.' };
  const { html } = renderAirportPage(airport, [routeRow()], 'de', {});
  assert.equal(robotsFrom(html), 'index, follow');
});

test('airport breadcrumb uses the localized country name', () => {
  const airport = { code: 'TXL', name: 'Berlin-Tegel', city: 'Berlin', city_slug: 'berlin', country: 'DE', translations: {} };
  const { html } = renderAirportPage(airport, [routeRow()], 'de', {});
  assert.match(html, />Deutschland<\/a>/);
  assert.match(html, /"name":"Deutschland"/);
});

// ─── #5 Flight-route thin-content noindex guard ───────────────────────────
test('route with no real data and no admin content is noindex', () => {
  const { html } = renderFlightRoutePage(routeRow(), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'noindex, follow');
});

test('route with a real distance is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});

test('dataless route WITH an admin intro is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ intro_text: 'Handgeschriebene Einleitung für diese Strecke.' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});

test('route with observed airlines is indexed', () => {
  const { html } = renderFlightRoutePage(routeRow({ airline_count: 3 }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.equal(robotsFrom(html), 'index, follow');
});
