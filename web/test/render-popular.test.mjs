// Tests for the "Popular destinations" hub renderer (render-popular.js).
// Exercises the real render path (setGeoData + renderPopularPage).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderPopularPage } = require('../lib/legacy-render/render-popular.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['BER'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
  ],
  [],
);

const fixture = () => ({
  destinations: [
    { slug: 'muenchen', iata: 'MUC', rawName: 'München', routeCount: 42 },
    { slug: 'berlin', iata: 'BER', rawName: 'Berlin', routeCount: 30 },
  ],
  topRoutes: [
    { slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München', origin_iata: 'BER', destination_iata: 'MUC', airline_count: 7 },
  ],
});

test('renders a complete, indexable document with canonical + hreflang', () => {
  const { html } = renderPopularPage(fixture(), 'de');
  assert.match(html, /<html lang="de"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/popular">/);
  assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/airpiv\.com\/en\/popular">/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /<h1>Beliebte Flugziele<\/h1>/);
});

test('destination cards link to city pages and show the real route count', () => {
  const { html } = renderPopularPage(fixture(), 'de');
  assert.match(html, /href="\/city\/muenchen"/);
  assert.match(html, /href="\/city\/berlin"/);
  assert.match(html, /42/); // real arriving-route count, not a fabricated score
});

test('most-served route cards link to flight pages and show the real airline_count', () => {
  const { html } = renderPopularPage(fixture(), 'de');
  assert.match(html, /href="\/flights\/ber-muc"/);
  assert.match(html, /7/);
});

test('non-default language uses prefixed links + localized city names', () => {
  const { html } = renderPopularPage(fixture(), 'en');
  assert.match(html, /href="\/en\/city\/muenchen"/);
  assert.match(html, /href="\/en\/flights\/ber-muc"/);
  assert.match(html, />Munich</); // localized, not the German "München"
});

test('emits ItemList schema for both destinations and routes', () => {
  const { html } = renderPopularPage(fixture(), 'de');
  const itemLists = html.match(/"@type":"ItemList"/g) || [];
  assert.equal(itemLists.length, 2);
  assert.match(html, /"@type":"BreadcrumbList"/);
});

test('an empty page is noindex (thin), still follow', () => {
  const { html } = renderPopularPage({ destinations: [], topRoutes: [] }, 'de');
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
});
