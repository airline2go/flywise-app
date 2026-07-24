// Tests for the HTML sitemap hub renderer (render-sitemap.js). Exercises the
// real render path (setGeoData + renderSitemapPage), like render-seo-guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderSitemapPage } = require('../lib/legacy-render/render-sitemap.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['BER', 'TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
    { city_slug: 'paris', name: 'Paris', airport_codes: ['CDG'], translations: { de: 'Paris', en: 'Paris' } },
  ],
  [
    { code: 'DE', name: 'Deutschland', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'FR', name: 'Frankreich', translations: { de: 'Frankreich', en: 'France' } },
  ],
);

const fixture = () => ({
  countries: [
    { code: 'DE', name: 'Deutschland', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'FR', name: 'Frankreich', translations: { de: 'Frankreich', en: 'France' } },
  ],
  cities: [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['BER'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
  ],
  airports: [
    { code: 'BER', airport: { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', translations: {} } },
    { code: 'MUC', airport: { code: 'MUC', name: 'München', city: 'München', translations: {} } },
  ],
  airlines: [
    { iata_code: 'LH', name: 'Lufthansa' },
    { iata_code: 'AF', name: 'Air France' },
  ],
  popularRoutes: [
    { slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München', origin_iata: 'BER', destination_iata: 'MUC' },
  ],
});

test('renders a complete, indexable document with canonical + hreflang', () => {
  const { html } = renderSitemapPage(fixture(), 'de');
  assert.match(html, /<html lang="de"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/sitemap">/);
  assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/airpiv\.com\/en\/sitemap">/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /<h1>Sitemap<\/h1>/);
});

test('links to every entity type with the right URL shape', () => {
  const { html } = renderSitemapPage(fixture(), 'de');
  assert.match(html, /href="\/country\/DE"/);
  assert.match(html, /href="\/city\/berlin"/);
  assert.match(html, /href="\/airport\/MUC"/);
  assert.match(html, /href="\/airline\/LH"/);
  assert.match(html, /href="\/flights\/ber-muc"/);
});

test('non-default language uses prefixed entity links + localized names', () => {
  const { html } = renderSitemapPage(fixture(), 'en');
  assert.match(html, /href="\/en\/city\/muenchen"/);
  assert.match(html, /href="\/en\/country\/FR"/);
  // Localized city + country names, not the raw German source.
  assert.match(html, />Munich</);
  assert.match(html, />Germany</);
  assert.match(html, /href="\/en\/flights\/ber-muc"/);
});

test('empty lists degrade gracefully (no section, no crash)', () => {
  const { html } = renderSitemapPage({ countries: [], cities: [], airports: [], airlines: [], popularRoutes: [] }, 'de');
  assert.match(html, /<h1>Sitemap<\/h1>/);
  // Main-pages section is always present (static links); entity sections drop out.
  assert.doesNotMatch(html, /All airlines|Alle Airlines/);
});

test('BreadcrumbList schema goes Home -> Sitemap', () => {
  const { html } = renderSitemapPage(fixture(), 'de');
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"name":"Sitemap","item":"https:\/\/airpiv\.com\/sitemap"/);
});
