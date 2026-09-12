// [P2.2/P0.2] The route meta description must not call the price "live" (or
// "real-time" / "en direct" / "canlı"): the server-rendered price is a
// historically observed aggregate, never a live bookable quote. Prices are
// described honestly ("flight prices"), and the "from {price}" clause appears
// only when a canonical price exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const trDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'translations');
const LANGS = ['de', 'en', 'es', 'fr', 'it', 'nl', 'tr', 'ar'];
// "live"/"real-time" claims per language that must not qualify the price.
const LIVE_CLAIMS = [/\blive\b/i, /in tiempo real/i, /en direct\b/i, /\bcanlı\b/i, /Live-/i];

test('no routeMeta string calls prices live/real-time', () => {
  for (const l of LANGS) {
    const meta = JSON.parse(readFileSync(join(trDir, `${l}.json`), 'utf8')).routeMeta || '';
    for (const re of LIVE_CLAIMS) {
      assert.ok(!re.test(meta), `${l} routeMeta contains a live-price claim: ${meta}`);
    }
  }
});

test('rendered meta: aggregate-priced route describes prices without a live claim, still shows a from-price', () => {
  const route = { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom', origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT', price_min: 60, price_currency: 'EUR', price_sample_count: 9, price_updated_at: '2026-09-01T00:00:00Z' };
  const links = { fromOrigin: [], toDestination: [] };
  for (const l of ['en', 'de']) {
    const { seo } = renderFlightRoutePage(route, l, [], links, []);
    for (const re of LIVE_CLAIMS) assert.ok(!re.test(seo.description), `${l} meta live claim: ${seo.description}`);
    assert.match(seo.description, /60/); // canonical from-price still surfaced
  }
});
