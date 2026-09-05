// [P0-8] Admin manual content (custom_title / custom_meta_description /
// intro_text / custom_faq) is authored in the SOURCE language (German) only.
// It must appear on the German page and must NOT leak onto /en, /ar, … which
// would show German copy on a non-German page. Non-German pages fall back to
// the localized generated/default content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

setGeoData(
  [
    { city_slug: 'berlin', airport_codes: ['BER', 'TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
  ],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);

const GERMAN_TITLE = 'HANDGESCHRIEBENER-DEUTSCHER-TITEL';
const GERMAN_META = 'HANDGESCHRIEBENE-DEUTSCHE-BESCHREIBUNG';
const GERMAN_INTRO = 'HANDGESCHRIEBENE-DEUTSCHE-EINLEITUNG-FUER-DIESE-STRECKE';
const GERMAN_FAQ_Q = 'DEUTSCHE-FAQ-FRAGE';

const routeRow = (over) => Object.assign({
  slug: 'txl-muc',
  origin_iata: 'TXL', destination_iata: 'MUC',
  origin_city: 'Berlin', destination_city: 'München',
  origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
  origin_country: 'DE', destination_country: 'DE',
  distance_km: 480, airline_count: 3, avg_duration_min: 70,
  custom_title: GERMAN_TITLE,
  custom_meta_description: GERMAN_META,
  intro_text: GERMAN_INTRO,
  custom_faq: [{ question: GERMAN_FAQ_Q, answer: 'DEUTSCHE-FAQ-ANTWORT' }],
}, over || {});

const render = (lang) => renderFlightRoutePage(routeRow(), lang, [], { fromOrigin: [], toDestination: [] }).html;

test('German page DOES use the admin manual content', () => {
  const html = render('de');
  assert.ok(html.includes(GERMAN_TITLE), 'custom_title on de');
  assert.ok(html.includes(GERMAN_META), 'custom_meta_description on de');
  assert.ok(html.includes(GERMAN_INTRO), 'intro_text on de');
  assert.ok(html.includes(GERMAN_FAQ_Q), 'custom_faq on de');
});

for (const lang of ['en', 'ar', 'fr', 'it', 'tr']) {
  test(`${lang} page does NOT leak any German manual content`, () => {
    const html = render(lang);
    assert.ok(!html.includes(GERMAN_TITLE), `custom_title leaked to ${lang}`);
    assert.ok(!html.includes(GERMAN_META), `custom_meta_description leaked to ${lang}`);
    assert.ok(!html.includes(GERMAN_INTRO), `intro_text leaked to ${lang}`);
    assert.ok(!html.includes(GERMAN_FAQ_Q), `custom_faq leaked to ${lang}`);
  });
}
