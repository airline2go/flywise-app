// [P14] Structural JSON-LD lint across every rendered page type — beyond
// "valid JSON" (template-jsonld.test.mjs) and "non-empty" (static-jsonld):
//   • every block is an object (or array of objects) carrying @context + @type;
//   • no fabricated trust signals — no aggregateRating / ratingValue /
//     reviewCount / Review anywhere (P13: fake ratings/reviews are never emitted);
//   • every URL referenced inside BreadcrumbList (item) and ItemList (url) is an
//     absolute https URL on the canonical host — never relative, http, an anchor,
//     an asset, or an off-host link (P3.3 / P3.4);
//   • an emitted ItemList actually lists items (no empty itemListElement).
// Referenced-URL 404/noindex checks are the live crawl audit's job (audit-*.mjs);
// this pins what can be verified deterministically offline.
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
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }, { code: 'FR', translations: { de: 'Frankreich', en: 'France' } }],
);

const routeRow = (over) => Object.assign({
  slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC', origin_city: 'Berlin', destination_city: 'München',
  origin_city_slug: 'berlin', destination_city_slug: 'muenchen', origin_country: 'DE', destination_country: 'DE',
  distance_km: 500, haul_type: 'short-haul', airline_count: 3, route_score: 60, indexable: true, updated_at: '2026-08-01T00:00:00Z',
}, over || {});
const routes = [routeRow(), routeRow({ slug: 'ber-cdg', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' })];

const FAKE_TRUST = /"(aggregateRating|ratingValue|reviewCount)"|"@type"\s*:\s*"Review"/;
const collectUrls = (node, key, out) => {
  if (Array.isArray(node)) { node.forEach((n) => collectUrls(n, key, out)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key && typeof v === 'string') out.push(v);
      else collectUrls(v, key, out);
    }
  }
};
const isCanonicalHttps = (u) => /^https:\/\/airpiv\.com(\/|$)/.test(u) && !/#|\.(css|js|png|jpg|svg|ico)(\?|$)/i.test(u);

function lint(html, label) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  assert.ok(blocks.length >= 1, `${label}: no JSON-LD`);
  for (const body of blocks) {
    assert.ok(!FAKE_TRUST.test(body), `${label}: fabricated rating/review in JSON-LD`);
    const data = JSON.parse(body);
    const nodes = Array.isArray(data) ? data : [data];
    for (const n of nodes) {
      assert.ok(n && n['@context'] && n['@type'], `${label}: JSON-LD node missing @context/@type`);
      if (n['@type'] === 'ItemList') {
        assert.ok(Array.isArray(n.itemListElement) && n.itemListElement.length > 0, `${label}: empty ItemList`);
      }
    }
    // Breadcrumb item URLs and ItemList list URLs must be absolute https, on-host.
    const urls = [];
    collectUrls(data, 'item', urls); // BreadcrumbList ListItem.item
    collectUrls(data, 'url', urls);  // ItemList ListItem.url / WebPage url / Offer url
    for (const u of urls) {
      if (typeof u !== 'string') continue;
      // Image/asset refs (publisher logo, cover image) legitimately appear under
      // `url` inside ImageObject/logo nodes — they are not navigational links.
      if (/\.(png|jpe?g|svg|webp|ico|gif)(\?|$)/i.test(u)) continue;
      assert.ok(isCanonicalHttps(u), `${label}: non-canonical URL in JSON-LD: ${u}`);
    }
  }
}

test('flight-route JSON-LD is structurally sound (with related ItemList)', () => {
  const related = [routeRow({ slug: 'ber-cdg', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' })];
  const { html } = renderFlightRoutePage(routeRow(), 'en', related, { fromOrigin: [], toDestination: [] }, []);
  lint(html, 'flight-route');
});
test('city JSON-LD is structurally sound', () => lint(renderCityPage({ city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER'] }, routes, 'de', {}).html, 'city'));
test('country JSON-LD is structurally sound', () => lint(renderCountryPage({ code: 'DE', name: 'Deutschland' }, routes, 'de', {}).html, 'country'));
test('airport JSON-LD is structurally sound', () => lint(renderAirportPage({ code: 'BER', iata_code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country_code: 'DE' }, routes, 'de', {}).html, 'airport'));
test('airline JSON-LD is structurally sound', () => lint(renderAirlinePage({ code: 'LH', iata_code: 'LH', name: 'Lufthansa' }, routes, 'de', [], {}).html, 'airline'));
test('blog-post JSON-LD is structurally sound', () => lint(renderBlogPostPage({ slug: 'roma-milano', title: 'Roma-Milano', content: '<p>Contenuto sufficientemente lungo per il test.</p>', published_at: '2026-08-08T00:00:00Z' }, routes, [], 'it').html, 'blog-post'));
