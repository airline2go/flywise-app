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
import { DEFAULT_LANGUAGE } from './languages.js';

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

export {
  buildGeoIndex,
  localizeCity, localizeCountry, localizeAirport,
  getAlternativeAirports, buildIataNameMap,
};
