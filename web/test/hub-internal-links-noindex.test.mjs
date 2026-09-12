// [P0.7] A hub page (city / country / airport / airline) must NEVER link
// internally to a route the backend marked indexable:false — linking to a
// noindex page wastes crawl budget and violates the evidence policy. The
// backend now attaches `indexable` to every hub route; these renderers drop
// indexable:false routes from their on-page route cards. A route with the flag
// absent (older backend / fixtures) is kept, preserving prior behaviour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderCityPage } = require('../lib/legacy-render/render-city.js');
const { renderCountryPage } = require('../lib/legacy-render/render-country.js');
const { renderAirportPage } = require('../lib/legacy-render/render-airport.js');
const { renderAirlinePage } = require('../lib/legacy-render/render-airline.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'] },
    { city_slug: 'muenchen', name: 'München', country_code: 'DE', airport_codes: ['MUC'] },
    { city_slug: 'palma', name: 'Palma', country_code: 'ES', airport_codes: ['PMI'] },
  ],
  [{ code: 'DE', name: 'Deutschland' }, { code: 'ES', name: 'Spanien' }],
);

// A good (indexable) route and a bad (noindex) one, both touching Berlin/BER/DE.
const good = { slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC', origin_city: 'Berlin', destination_city: 'München', origin_city_slug: 'berlin', destination_city_slug: 'muenchen', origin_country: 'DE', destination_country: 'DE', indexable: true };
const bad = { slug: 'ber-pmi', origin_iata: 'BER', destination_iata: 'PMI', origin_city: 'Berlin', destination_city: 'Palma', origin_city_slug: 'berlin', destination_city_slug: 'palma', origin_country: 'DE', destination_country: 'ES', indexable: false };
const routes = [good, bad];

const linksTo = (html, slug) => html.includes(`flights/${slug}`);

test('[P0.7] city page links the indexable route, never the noindex one', () => {
  const { html } = renderCityPage({ city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'] }, routes, 'de', {});
  assert.ok(linksTo(html, 'ber-muc'), 'city should link the indexable route');
  assert.ok(!linksTo(html, 'ber-pmi'), 'city must NOT link the noindex route');
});

test('[P0.7] country page links the indexable route, never the noindex one', () => {
  const { html } = renderCountryPage({ code: 'DE', name: 'Deutschland' }, routes, 'de', {});
  assert.ok(linksTo(html, 'ber-muc'));
  assert.ok(!linksTo(html, 'ber-pmi'), 'country must NOT link the noindex route');
});

test('[P0.7] airport page links the indexable route, never the noindex one', () => {
  const { html } = renderAirportPage({ code: 'BER', iata_code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country_code: 'DE' }, routes, 'de', {});
  assert.ok(linksTo(html, 'ber-muc'));
  assert.ok(!linksTo(html, 'ber-pmi'), 'airport must NOT link the noindex route');
});

test('[P0.7] airline page links the indexable route, never the noindex one (full list + most-used)', () => {
  const { html } = renderAirlinePage({ code: 'LH', iata_code: 'LH', name: 'Lufthansa' }, routes, 'de', routes, {});
  assert.ok(linksTo(html, 'ber-muc'));
  assert.ok(!linksTo(html, 'ber-pmi'), 'airline must NOT link the noindex route');
});

test('[P0.7] flag absent → route is kept (prior behaviour preserved)', () => {
  const noFlag = [{ slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC', origin_city: 'Berlin', destination_city: 'München', origin_city_slug: 'berlin', destination_city_slug: 'muenchen', origin_country: 'DE', destination_country: 'DE' }];
  const { html } = renderCityPage({ city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'] }, noFlag, 'de', {});
  assert.ok(linksTo(html, 'ber-muc'));
});
