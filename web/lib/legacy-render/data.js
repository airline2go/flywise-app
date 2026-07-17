// Shared i18n/data module for the page generator. City/country/airport
// display names used to live in hardcoded GERMAN_CITY_NAMES/
// ENGLISH_CITY_NAMES/ENGLISH_COUNTRY_NAMES dictionaries here — they now
// come from the database (city_translations/country_translations,
// fetched once via GET /cities and GET /countries and handed to
// setGeoData() by generate-pages.js's main() before any page renders),
// so adding a language or a new city/country never needs a code change.
const { DEFAULT_LANGUAGE } = require('./languages');

let CITY_BY_SLUG = {};
let IATA_TO_SLUG = {};
let COUNTRY_BY_CODE = {};

// Called once by generate-pages.js's main() after fetching the /cities
// and /countries lists — populates the lookup tables every localize*()
// call below reads from for the rest of the build run.
function setGeoData(cities, countries) {
  CITY_BY_SLUG = {};
  IATA_TO_SLUG = {};
  (cities || []).forEach((c) => {
    CITY_BY_SLUG[c.city_slug] = c;
    (c.airport_codes || []).forEach((code) => { IATA_TO_SLUG[code] = c.city_slug; });
  });
  COUNTRY_BY_CODE = {};
  (countries || []).forEach((c) => { COUNTRY_BY_CODE[c.code] = c; });
}

// language -> English -> German -> the untranslated name itself (never a
// blank/missing string) — same fallback chain shape as build/translate.js.
function resolveTranslation(translations, lang, fallbackName) {
  if (!translations) return fallbackName;
  if (translations[lang]) return translations[lang];
  if (translations.en) return translations.en;
  if (translations[DEFAULT_LANGUAGE]) return translations[DEFAULT_LANGUAGE];
  return fallbackName;
}

// A city's name translations apply to every airport serving it (e.g.
// LHR/LGW/STN/LTN all localize to the same "London") — iata is resolved
// to its city via IATA_TO_SLUG before looking up translations.
function localizeCity(name, iata, lang) {
  const slug = iata && IATA_TO_SLUG[iata];
  const city = slug && CITY_BY_SLUG[slug];
  return resolveTranslation(city && city.translations, lang, name);
}

// Resolve an IATA code to the city_slug of the city it serves (via the
// IATA_TO_SLUG table setGeoData() built). Used where only an airport code is
// available (e.g. the route-pages list carries IATA but no city_slug) and a
// link to the city page is needed.
function slugForIata(iata) {
  return (iata && IATA_TO_SLUG[iata]) || null;
}

function localizeCountry(name, code, lang) {
  const country = code && COUNTRY_BY_CODE[code];
  return resolveTranslation(country && country.translations, lang, name);
}

// Airport name translations (a single airport, not shared across a city)
// — resolved from the `translations` map already attached to the airport
// object returned by GET /airports/:code (see content.routes.js), not
// from setGeoData()'s city/country lookups.
function localizeAirport(airport, lang) {
  return resolveTranslation(airport && airport.translations, lang, airport && airport.name);
}

// [ALTERNATIVE-AIRPORTS] Sibling airports serving the same city as
// `excludeIata` — read directly from that city's own `airport_codes`
// array (already fetched via setGeoData()), rather than the old
// approach of matching on a localized display-name string.
function getAlternativeAirports(cityName, excludeIata, lang) {
  const slug = excludeIata && IATA_TO_SLUG[excludeIata];
  const city = slug && CITY_BY_SLUG[slug];
  if (!city) return [];
  return (city.airport_codes || []).filter((c) => c !== excludeIata);
}

// [LIVE-PRICE-WIDGET] Route pages fetch "related routes" client-side
// (real-time data, never baked into the static page) — the response
// carries origin_city/destination_city as raw, non-localized display
// names. For any non-default language, render-flight-route.js's
// buildLiveScript() embeds the result of this function (a flat
// {IATA: localizedName} map, built once at build time from the same
// city_translations data setGeoData() already loaded) directly into the
// generated page's inline script, so the browser can relocalize those
// names into the page's language without a second network round trip.
// German needs no such map: origin_city/destination_city are already
// stored in German, the platform's default/source language.
function buildIataNameMap(lang) {
  const map = {};
  Object.keys(CITY_BY_SLUG).forEach((slug) => {
    const city = CITY_BY_SLUG[slug];
    const name = resolveTranslation(city.translations, lang, city.name);
    (city.airport_codes || []).forEach((code) => { map[code] = name; });
  });
  return map;
}

// [CONTEXT-DETECTION] known cities/countries for the blog "popular routes"/
// "similar posts" matching — ported verbatim from blog-post.html/-en.html.
// Blog posts stay DE/EN-only (independently-authored content per
// language via separate backend endpoints), so this stays untouched.
const KNOWN_CITIES = ['Berlin', 'München', 'Munich', 'Frankfurt', 'Hamburg', 'Düsseldorf', 'Cologne', 'Köln', 'Stuttgart', 'Hannover', 'Leipzig', 'Nürnberg', 'Nuremberg', 'Dortmund', 'Bremen', 'Wien', 'Vienna', 'Zürich', 'Zurich', 'Genf', 'Geneva', 'London', 'Paris', 'Rom', 'Rome', 'Mailand', 'Milan', 'Venedig', 'Venice', 'Neapel', 'Naples', 'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Seville', 'Malaga', 'Lissabon', 'Lisbon', 'Porto', 'Amsterdam', 'Brüssel', 'Brussels', 'Luxemburg', 'Luxembourg', 'Kopenhagen', 'Copenhagen', 'Oslo', 'Stockholm', 'Helsinki', 'Dublin', 'Warschau', 'Warsaw', 'Krakau', 'Krakow', 'Prag', 'Prague', 'Budapest', 'Athen', 'Athens', 'Istanbul', 'Kairo', 'Cairo', 'Dubai', 'Doha', 'Bangkok', 'Singapur', 'Singapore', 'Hongkong', 'Hong Kong', 'Tokio', 'Tokyo', 'New York', 'Los Angeles', 'San Francisco', 'Miami', 'Toronto', 'São Paulo', 'Kapstadt', 'Cape Town', 'Johannesburg', 'Sydney', 'Melbourne', 'Dubrovnik', 'Split', 'Zagreb'];

const CITY_COUNTRY_DE = {
  Berlin: 'Deutschland', München: 'Deutschland', Munich: 'Deutschland', Frankfurt: 'Deutschland', Hamburg: 'Deutschland', Düsseldorf: 'Deutschland', Cologne: 'Deutschland', Köln: 'Deutschland', Stuttgart: 'Deutschland', Hannover: 'Deutschland', Leipzig: 'Deutschland', Nürnberg: 'Deutschland', Nuremberg: 'Deutschland', Dortmund: 'Deutschland', Bremen: 'Deutschland',
  Wien: 'Österreich', Vienna: 'Österreich',
  Zürich: 'Schweiz', Zurich: 'Schweiz', Genf: 'Schweiz', Geneva: 'Schweiz',
  London: 'Vereinigtes Königreich',
  Paris: 'Frankreich',
  Rom: 'Italien', Rome: 'Italien', Mailand: 'Italien', Milan: 'Italien', Venedig: 'Italien', Venice: 'Italien', Neapel: 'Italien', Naples: 'Italien',
  Madrid: 'Spanien', Barcelona: 'Spanien', Valencia: 'Spanien', Sevilla: 'Spanien', Seville: 'Spanien', Malaga: 'Spanien',
  Lissabon: 'Portugal', Lisbon: 'Portugal', Porto: 'Portugal',
  Amsterdam: 'Niederlande',
  Brüssel: 'Belgien', Brussels: 'Belgien',
  Luxemburg: 'Luxemburg', Luxembourg: 'Luxemburg',
  Kopenhagen: 'Dänemark', Copenhagen: 'Dänemark',
  Oslo: 'Norwegen', Stockholm: 'Schweden', Helsinki: 'Finnland', Dublin: 'Irland',
  Warschau: 'Polen', Warsaw: 'Polen', Krakau: 'Polen', Krakow: 'Polen',
  Prag: 'Tschechien', Prague: 'Tschechien', Budapest: 'Ungarn', Athen: 'Griechenland', Athens: 'Griechenland',
  Istanbul: 'Türkei', Kairo: 'Ägypten', Cairo: 'Ägypten', Dubai: 'VAE', Doha: 'Katar',
  Bangkok: 'Thailand', Singapur: 'Singapur', Singapore: 'Singapur', Hongkong: 'Hongkong', 'Hong Kong': 'Hongkong', Tokio: 'Japan', Tokyo: 'Japan',
  'New York': 'USA', 'Los Angeles': 'USA', 'San Francisco': 'USA', Miami: 'USA',
  Toronto: 'Kanada', 'São Paulo': 'Brasilien', Kapstadt: 'Südafrika', 'Cape Town': 'Südafrika', Johannesburg: 'Südafrika',
  Sydney: 'Australien', Melbourne: 'Australien', Dubrovnik: 'Kroatien', Split: 'Kroatien', Zagreb: 'Kroatien',
};

const CITY_COUNTRY_EN = {
  Berlin: 'Germany', München: 'Germany', Munich: 'Germany', Frankfurt: 'Germany', Hamburg: 'Germany', Düsseldorf: 'Germany', Cologne: 'Germany', Köln: 'Germany', Stuttgart: 'Germany', Hannover: 'Germany', Leipzig: 'Germany', Nürnberg: 'Germany', Nuremberg: 'Germany', Dortmund: 'Germany', Bremen: 'Germany',
  Wien: 'Austria', Vienna: 'Austria',
  Zürich: 'Switzerland', Zurich: 'Switzerland', Genf: 'Switzerland', Geneva: 'Switzerland',
  London: 'United Kingdom',
  Paris: 'France',
  Rom: 'Italy', Rome: 'Italy', Mailand: 'Italy', Milan: 'Italy', Venedig: 'Italy', Venice: 'Italy', Neapel: 'Italy', Naples: 'Italy',
  Madrid: 'Spain', Barcelona: 'Spain', Valencia: 'Spain', Sevilla: 'Spain', Seville: 'Spain', Malaga: 'Spain',
  Lissabon: 'Portugal', Lisbon: 'Portugal', Porto: 'Portugal',
  Amsterdam: 'Netherlands',
  Brüssel: 'Belgium', Brussels: 'Belgium',
  Luxemburg: 'Luxembourg', Luxembourg: 'Luxembourg',
  Kopenhagen: 'Denmark', Copenhagen: 'Denmark',
  Oslo: 'Norway', Stockholm: 'Sweden', Helsinki: 'Finland', Dublin: 'Ireland',
  Warschau: 'Poland', Warsaw: 'Poland', Krakau: 'Poland', Krakow: 'Poland',
  Prag: 'Czech Republic', Prague: 'Czech Republic', Budapest: 'Hungary', Athen: 'Greece', Athens: 'Greece',
  Istanbul: 'Turkey', Kairo: 'Egypt', Cairo: 'Egypt', Dubai: 'VAE', Doha: 'Qatar',
  Bangkok: 'Thailand', Singapur: 'Singapore', Singapore: 'Singapore', Hongkong: 'Hong Kong', 'Hong Kong': 'Hong Kong', Tokio: 'Japan', Tokyo: 'Japan',
  'New York': 'USA', 'Los Angeles': 'USA', 'San Francisco': 'USA', Miami: 'USA',
  Toronto: 'Canada', 'São Paulo': 'Brazil', Kapstadt: 'South Africa', 'Cape Town': 'South Africa', Johannesburg: 'South Africa',
  Sydney: 'Australia', Melbourne: 'Australia', Dubrovnik: 'Croatia', Split: 'Croatia', Zagreb: 'Croatia',
};

function detectCitiesInText(text) {
  const found = [];
  KNOWN_CITIES.forEach((city) => {
    const re = new RegExp('(^|[^a-zA-ZäöüÄÖÜ])' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zA-ZäöüÄÖÜ]|$)', 'i');
    if (re.test(text)) found.push(city);
  });
  return found;
}
function citiesToCountries(cities, lang) {
  const table = lang === 'en' ? CITY_COUNTRY_EN : CITY_COUNTRY_DE;
  const set = {};
  cities.forEach((c) => { const co = table[c]; if (co) set[co] = true; });
  return Object.keys(set);
}

module.exports = {
  setGeoData,
  localizeCity, localizeCountry, localizeAirport,
  getAlternativeAirports, buildIataNameMap, slugForIata,
  KNOWN_CITIES, detectCitiesInText, citiesToCountries,
};
