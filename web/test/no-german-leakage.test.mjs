// [P5.1] German SEO text must never leak into a non-German page. This renders a
// route page (the dominant page type) in every non-German language and fails if
// an unmistakably-German SEO phrase appears in the <title>, meta description or
// H1. German CITY NAMES are exempt (P5.1) — the sentinels below are template
// phrases, never place names — so a route to/from a German city is fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const NON_DE = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
// German SEO template phrases (NOT city names). If any appears in a non-de
// page's title/desc/H1, a German template leaked instead of being localized.
const GERMAN_SEO = [/Flüge von/i, /\bVergleiche\b/, /Flugzeit/i, /Entfernung/i, /Direktflüge/i, /\bPreise\b/, /Jetzt Flüge/i, /Wie lange dauert/i, /Günstige Flüge/i];

// A data-rich route (price + real duration + airlines + direct) and a
// distance-only route (exercises the P2.1 distance-only title path) — both use
// German-named endpoints on purpose, to prove city names are not flagged.
const RICH = { slug: 'ams-fra', origin_iata: 'AMS', destination_iata: 'FRA', origin_city: 'Amsterdam', destination_city: 'Frankfurt', origin_city_slug: 'amsterdam', destination_city_slug: 'frankfurt', origin_country: 'NL', destination_country: 'DE', distance_km: 365, avg_duration_min: 70, airline_count: 4, all_direct: true, price_min: 59, price_currency: 'EUR', price_sample_count: 9, price_updated_at: '2026-09-01T00:00:00Z' };
const THIN = { slug: 'muc-ham', origin_iata: 'MUC', destination_iata: 'HAM', origin_city: 'München', destination_city: 'Hamburg', origin_city_slug: 'muenchen', destination_city_slug: 'hamburg', origin_country: 'DE', destination_country: 'DE', distance_km: 600 };
const links = { fromOrigin: [], toDestination: [] };

const seoFields = (route, lang) => {
  const { seo, html } = renderFlightRoutePage(route, lang, [], links, []);
  const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  return `${seo.title}\n${seo.description}\n${h1}`;
};

for (const route of [RICH, THIN]) {
  for (const lang of NON_DE) {
    test(`no German SEO leakage in /${lang} route page (${route.slug})`, () => {
      const text = seoFields(route, lang);
      for (const re of GERMAN_SEO) {
        assert.ok(!re.test(text), `/${lang} ${route.slug} leaks German SEO phrase ${re}:\n${text}`);
      }
    });
  }
}

test('the German page DOES render German SEO text (sentinel sanity check)', () => {
  const text = seoFields(RICH, 'de');
  assert.ok(GERMAN_SEO.some((re) => re.test(text)), `de page unexpectedly has no German SEO phrase:\n${text}`);
});
