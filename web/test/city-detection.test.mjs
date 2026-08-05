// Tests the dynamic city recognizer that replaced the old static KNOWN_CITIES
// list: names are indexed from the live city data (setGeoData) and matched
// accent/case/punctuation-insensitively, multi-word aware, with IATA aliases —
// returning canonical city slugs so callers cross-link by entity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../lib/legacy-render/data.js');
const { setGeoData, detectCitiesInText, citiesToCountries, cityNameForSlug, slugForIata } = data;

setGeoData(
  [
    { city_slug: 'malaga', name: 'Málaga', country_code: 'ES', airport_codes: ['AGP'], translations: { de: 'Málaga', en: 'Malaga', es: 'Málaga' } },
    { city_slug: 'ibiza', name: 'Ibiza', country_code: 'ES', airport_codes: ['IBZ'], translations: { de: 'Ibiza', en: 'Ibiza', es: 'Ibiza' } },
    { city_slug: 'muenchen', name: 'München', country_code: 'DE', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
    { city_slug: 'koeln', name: 'Köln', country_code: 'DE', airport_codes: ['CGN'], translations: { de: 'Köln', en: 'Cologne' } },
    { city_slug: 'sao-paulo', name: 'São Paulo', country_code: 'BR', airport_codes: ['GRU'], translations: { de: 'São Paulo', en: 'Sao Paulo' } },
    { city_slug: 'new-york', name: 'New York', country_code: 'US', airport_codes: ['JFK', 'EWR'], translations: { de: 'New York', en: 'New York' } },
  ],
  [
    { code: 'ES', translations: { de: 'Spanien', en: 'Spain' } },
    { code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'BR', translations: { de: 'Brasilien', en: 'Brazil' } },
  ],
);

const detect = (t) => detectCitiesInText(t).sort();

test('accent-insensitive: Málaga / MÁLAGA / malaga all resolve to the same slug', () => {
  assert.deepEqual(detect('Günstige Flüge nach Málaga'), ['malaga']);
  assert.deepEqual(detect('MÁLAGA im Sommer'), ['malaga']);
  assert.deepEqual(detect('cheap flights to malaga'), ['malaga']);
});

test('the reported case: an Ibiza + Málaga article detects both (Ibiza was previously unrecognized)', () => {
  assert.deepEqual(detect('Party und Strand: Málaga und Ibiza'), ['ibiza', 'malaga']);
});

test('folds Köln→koln (de) and matches Cologne (en) to the same slug', () => {
  assert.deepEqual(detect('Ein Wochenende in Koln'), ['koeln']);
  assert.deepEqual(detect('A weekend in Cologne'), ['koeln']);
});

test('multi-word names: São Paulo (accent) and New York', () => {
  assert.deepEqual(detect('Reise nach Sao Paulo'), ['sao-paulo']);
  assert.deepEqual(detect('I love New York'), ['new-york']);
});

test('punctuation and casing are trimmed', () => {
  assert.deepEqual(detect('Ziel: Málaga, dann Ibiza!'), ['ibiza', 'malaga']);
});

test('explicit uppercase IATA codes match; lowercase look-alike words do not', () => {
  assert.deepEqual(detect('Ab MUC nonstop'), ['muenchen']);
  assert.deepEqual(detect('that was much fun'), []); // "much" must not match MUC
});

test('unknown cities are ignored (only published entities are returned)', () => {
  assert.deepEqual(detect('A trip to Atlantis and Gotham'), []);
});

test('slugForIata resolves route airport codes to the same slug space', () => {
  assert.equal(slugForIata('AGP'), 'malaga');
  assert.equal(slugForIata('IBZ'), 'ibiza');
  // …so an Ibiza+Málaga article now links to the malaga-ibiza route:
  const articleSlugs = new Set(detectCitiesInText('Urlaub in Málaga mit Tagesausflug nach Ibiza'));
  assert.ok(articleSlugs.has(slugForIata('AGP')) && articleSlugs.has(slugForIata('IBZ')));
});

test('citiesToCountries maps slugs to localized country names', () => {
  assert.deepEqual(citiesToCountries(['malaga', 'ibiza'], 'en'), ['Spain']);
  assert.deepEqual(citiesToCountries(['malaga', 'muenchen'], 'de').sort(), ['Deutschland', 'Spanien']);
});

test('cityNameForSlug returns the localized display name', () => {
  assert.equal(cityNameForSlug('muenchen', 'en'), 'Munich');
  assert.equal(cityNameForSlug('muenchen', 'de'), 'München');
});
