// [P5.2] hreflang consistency for a route page: every language version exists at
// its own self-canonical URL, so each rendered page must emit the FULL reciprocal
// cluster (all 8 languages + x-default), include a self-referential alternate,
// point each alternate at the correct per-language URL (de unprefixed, others
// /<lang>/…), send x-default to the German/default URL, and set its own canonical
// to self. This pins the cluster so a future change can't drop, misroute, or
// desync a language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const SITE = 'https://airpiv.com';
const LANGS = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
const urlFor = (lang, slug) => (lang === 'de' ? `${SITE}/flights/${slug}` : `${SITE}/${lang}/flights/${slug}`);

const R = { slug: 'ams-fra', origin_iata: 'AMS', destination_iata: 'FRA', origin_city: 'Amsterdam', destination_city: 'Frankfurt', origin_city_slug: 'amsterdam', destination_city_slug: 'frankfurt', origin_country: 'NL', destination_country: 'DE', distance_km: 365, avg_duration_min: 70, airline_count: 4 };
const links = { fromOrigin: [], toDestination: [] };

const alternates = (html) => {
  const map = {};
  for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) map[m[1]] = m[2];
  return map;
};
const canonicalOf = (html) => (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];

for (const lang of LANGS) {
  test(`/${lang} route page: full reciprocal hreflang cluster + self canonical`, () => {
    const { html } = renderFlightRoutePage(R, lang, [], links, []);
    const alt = alternates(html);
    // every language alternate present, each pointing at the correct URL
    for (const l of LANGS) {
      assert.equal(alt[l], urlFor(l, R.slug), `${lang} page: hreflang ${l} target`);
    }
    // self-referential alternate present
    assert.equal(alt[lang], urlFor(lang, R.slug), `${lang} page: self hreflang`);
    // x-default → German/default (unprefixed)
    assert.equal(alt['x-default'], urlFor('de', R.slug), `${lang} page: x-default target`);
    // exactly the 8 langs + x-default, no extras
    assert.equal(Object.keys(alt).length, LANGS.length + 1, `${lang} page: alternate count`);
    // canonical is self
    assert.equal(canonicalOf(html), urlFor(lang, R.slug), `${lang} page: self canonical`);
  });
}
