// Regression test for the live-price <script> on route pages: every translated
// label it embeds must produce syntactically valid JS in ALL languages. The
// French value "prix vérifiés aujourd'hui" (apostrophe) used to be inlined into
// a single-quoted string, which closed the string early and broke the entire
// script — so French route pages silently never showed a price. Embedding via
// JSON.stringify fixes it; this test guards against a regression in any language.
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
};

const LANGS = ['en', 'de', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];

// The live <script> is the one that fetches the live price.
function liveScriptBody(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return scripts.find((s) => s.includes('/route-price'));
}

test('live-price script is syntactically valid JS in every language', () => {
  process.env.SHOW_ROUTE_PRICES = 'true'; // the price fetch only exists when prices are enabled
  for (const lang of LANGS) {
    const { html } = renderFlightRoutePage(routeRow, lang, [], { fromOrigin: [], toDestination: [] }, []);
    const body = liveScriptBody(html);
    assert.ok(body, `no live-price script found for ${lang}`);
    // new Function() PARSES the body (without executing it) — it throws a
    // SyntaxError if an unescaped quote/apostrophe broke a string literal.
    assert.doesNotThrow(() => new Function(body), `live-price script has a syntax error in "${lang}"`);
  }
});

test('French specifically (the apostrophe case) is valid and carries the price fetch', () => {
  process.env.SHOW_ROUTE_PRICES = 'true';
  const { html } = renderFlightRoutePage(routeRow, 'fr', [], { fromOrigin: [], toDestination: [] }, []);
  const body = liveScriptBody(html);
  assert.doesNotThrow(() => new Function(body));
  assert.match(body, /route-price/);
});
