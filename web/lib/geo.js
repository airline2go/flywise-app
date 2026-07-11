// Adapted from flywise-app/build/data.js.
//
// [PORT-ADAPTATION] The original module built its city/airport/country
// lookup tables ONCE into module-level mutable variables (`setGeoData()`
// called a single time at the start of a single-threaded batch build) and
// every function read from that shared state for the rest of the run.
// That's safe for a one-shot Node script but NOT safe here: a Next.js
// server handles many concurrent requests in the same process, so
// module-level mutable state populated by one request could leak into or
// race with another request rendering at the same time. Every function
// below instead takes an explicit `index` (built once per request via
// `getGeoIndex()` in content-api.js, which uses React's `cache()` for
// request-scoped memoization) rather than reading shared globals.
import { DEFAULT_LANGUAGE } from './languages';

// Pure — builds the same three lookup tables the original setGeoData()
// populated, but returns them instead of assigning to module state.
function buildGeoIndex(cities, countries) {
  const cityBySlug = {};
  const iataToSlug = {};
  (cities || []).forEach((c) => {
    cityBySlug[c.city_slug] = c;
    (c.airport_codes || []).forEach((code) => { iataToSlug[code] = c.city_slug; });
  });
  const countryByCode = {};
  (countries || []).forEach((c) => { countryByCode[c.code] = c; });
  return { cityBySlug, iataToSlug, countryByCode };
}

// language -> English -> German -> the untranslated name itself (never a
// blank/missing string) — same fallback chain shape as translate.js.
function resolveTranslation(translations, lang, fallbackName) {
  if (!translations) return fallbackName;
  if (translations[lang]) return translations[lang];
  if (translations.en) return translations.en;
  if (translations[DEFAULT_LANGUAGE]) return translations[DEFAULT_LANGUAGE];
  return fallbackName;
}

// A city's name translations apply to every airport serving it (e.g.
// LHR/LGW/STN/LTN all localize to the same "London") — iata is resolved
// to its city via index.iataToSlug before looking up translations.
function localizeCity(index, name, iata, lang) {
  const slug = iata && index.iataToSlug[iata];
  const city = slug && index.cityBySlug[slug];
  return resolveTranslation(city && city.translations, lang, name);
}

function localizeCountry(index, name, code, lang) {
  const country = code && index.countryByCode[code];
  return resolveTranslation(country && country.translations, lang, name);
}

// Airport name translations (a single airport, not shared across a city)
// — resolved from the `translations` map already attached to the airport
// object returned by GET /airports/:code, not from the geo index.
function localizeAirport(airport, lang) {
  return resolveTranslation(airport && airport.translations, lang, airport && airport.name);
}

// [ALTERNATIVE-AIRPORTS] Sibling airports serving the same city as
// `excludeIata` — read directly from that city's own `airport_codes`
// array.
function getAlternativeAirports(index, cityName, excludeIata, lang) {
  const slug = excludeIata && index.iataToSlug[excludeIata];
  const city = slug && index.cityBySlug[slug];
  if (!city) return [];
  return (city.airport_codes || []).filter((c) => c !== excludeIata);
}

// A flat {IATA: localizedName} map for a language, built from the geo
// index — used to relocalize origin_city/destination_city display names
// (which arrive from live/related-route data in German, the source
// language) without a second network round trip.
function buildIataNameMap(index, lang) {
  const map = {};
  Object.keys(index.cityBySlug).forEach((slug) => {
    const city = index.cityBySlug[slug];
    const name = resolveTranslation(city.translations, lang, city.name);
    (city.airport_codes || []).forEach((code) => { map[code] = name; });
  });
  return map;
}

// [CONTEXT-DETECTION] known cities/countries for the blog "popular
// routes"/"similar posts" matching — pure static data, no per-request
// state, ported verbatim. Blog posts stay DE/EN-only (independently-
// authored content per language via separate backend endpoints).
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

export {
  buildGeoIndex,
  localizeCity, localizeCountry, localizeAirport,
  getAlternativeAirports, buildIataNameMap,
  KNOWN_CITIES, detectCitiesInText, citiesToCountries,
};
