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

const routeRow = {
  slug: 'txl-muc', origin_iata: 'TXL', destination_iata: 'MUC',
  origin_city: 'Berlin', destination_city: 'München',
  origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
  origin_country: 'DE', destination_country: 'DE',
  distance_km: 480, avg_duration_min: 90, haul_type: 'short-haul',
  price_min: 99, price_avg: 120, price_max: 150, price_sample_count: 8,
  price_currency: 'EUR', price_updated_at: '2026-09-18T12:00:00Z',
};

const LANGS = ['en', 'de', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];

function trackingScriptBody(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return scripts.find((body) => body.includes('/track/route-page'));
}

test('route page tracking script is valid and never requests route prices', () => {
  for (const lang of LANGS) {
    const { html } = renderFlightRoutePage(routeRow, lang, [], { fromOrigin: [], toDestination: [] }, []);
    const body = trackingScriptBody(html);
    assert.ok(body, `no route tracking script found for ${lang}`);
    assert.doesNotThrow(() => new Function(body));
    assert.doesNotMatch(body, /\/route-price/);
    assert.doesNotMatch(html, /id="route-price-box"/);
  }
});

test('historical price fields no longer render visible route-page pricing', () => {
  const { html, seo } = renderFlightRoutePage(routeRow, 'en', [], { fromOrigin: [], toDestination: [] }, []);
  assert.doesNotMatch(html, />120 €</);
  assert.doesNotMatch(html, /\/route-price/);
  assert.doesNotMatch(seo.title, /Price/i);
});
