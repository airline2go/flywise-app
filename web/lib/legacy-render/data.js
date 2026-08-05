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

// [CITY-RECOGNITION] Dynamic recognition dataset, rebuilt by setGeoData() from
// the live city list — replaces the old hardcoded KNOWN_CITIES/CITY_COUNTRY_*
// tables so every published (and future) city is recognized with zero manual
// maintenance. NAME_INDEX maps a folded name variant -> Set<city_slug>;
// IATA_ALIAS maps an uppercase IATA code -> Set<city_slug>; MAX_NGRAM is the
// longest name (in words) so detection only slides windows as wide as needed.
let NAME_INDEX = new Map();
let IATA_ALIAS = new Map();
let MAX_NGRAM = 1;
const NGRAM_CAP = 6;

// Unicode-fold a string for accent/case/punctuation-insensitive matching:
// NFKD-decompose and drop combining marks, map the European letters that do
// NOT decompose (ß, ø, æ, œ, ł, đ/ð) to their base, lowercase, then collapse
// every run of non-letter/non-digit to a single space and trim. So "Málaga",
// "MÁLAGA" and "Malaga," all fold to "malaga"; "Köln" -> "koln"; "Zürich" ->
// "zurich"; "São Paulo" -> "sao paulo". \p{L}/\p{N} keep non-Latin scripts
// (Arabic, Cyrillic, …) intact so their translations match too.
function foldText(s) {
  return String(s == null ? '' : s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đðÐ]/g, 'd')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function addToSetMap(map, key, slug) {
  if (!key) return;
  let set = map.get(key);
  if (!set) { set = new Set(); map.set(key, set); }
  set.add(slug);
}

function indexCityName(variant, slug) {
  const key = foldText(variant);
  if (!key || key.length < 2) return; // skip empties and 1-char noise
  addToSetMap(NAME_INDEX, key, slug);
  const words = key.split(' ').length;
  if (words > MAX_NGRAM) MAX_NGRAM = Math.min(words, NGRAM_CAP);
}

// Called once (per request via ensureGeo(), or once per build) after fetching
// the /cities and /countries lists — populates the localize*() lookup tables
// AND the dynamic city-recognition index above.
function setGeoData(cities, countries) {
  CITY_BY_SLUG = {};
  IATA_TO_SLUG = {};
  NAME_INDEX = new Map();
  IATA_ALIAS = new Map();
  MAX_NGRAM = 1;
  (cities || []).forEach((c) => {
    if (!c || !c.city_slug) return;
    CITY_BY_SLUG[c.city_slug] = c;
    (c.airport_codes || []).forEach((code) => {
      IATA_TO_SLUG[code] = c.city_slug;
      if (code) addToSetMap(IATA_ALIAS, String(code).toUpperCase(), c.city_slug);
    });
    // Every name this city is known by — its canonical name plus each localized
    // translation — folds to the same slug, so a mention in any language links
    // back to the one city entity.
    const variants = [c.name].concat(c.translations ? Object.values(c.translations) : []);
    variants.forEach((v) => indexCityName(v, c.city_slug));
  });
  COUNTRY_BY_CODE = {};
  (countries || []).forEach((c) => { if (c && c.code) COUNTRY_BY_CODE[c.code] = c; });
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

// [CITY-RECOGNITION] Blog "popular routes" / "similar posts" matching now runs
// off the dynamic NAME_INDEX / IATA_ALIAS that setGeoData() built from the live
// city list — no hardcoded city list, so every published and future city is
// recognized automatically with zero manual maintenance.

// Return the published city slugs a text mentions — accent/case/punctuation-
// insensitive, multi-word aware, plus explicit uppercase IATA codes. Returns
// canonical slugs (not display names) so callers cross-link by entity,
// language-independently.
function detectCitiesInText(text) {
  const raw = String(text == null ? '' : text);
  const slugs = new Set();
  // Explicit IATA codes ("MUC", "FRA") — only as a standalone 3-letter
  // uppercase token, so lowercase words can never false-match a code.
  const codes = raw.match(/\b[A-Z]{3}\b/g);
  if (codes) {
    codes.forEach((code) => {
      const set = IATA_ALIAS.get(code);
      if (set) set.forEach((s) => slugs.add(s));
    });
  }
  // City names, matched as whole-word 1..MAX_NGRAM windows over the folded text.
  const folded = foldText(raw);
  if (folded) {
    const tokens = folded.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      let key = tokens[i];
      let set = NAME_INDEX.get(key);
      if (set) set.forEach((s) => slugs.add(s));
      for (let n = 1; n < MAX_NGRAM && i + n < tokens.length; n++) {
        key += ' ' + tokens[i + n];
        set = NAME_INDEX.get(key);
        if (set) set.forEach((s) => slugs.add(s));
      }
    }
  }
  return [...slugs];
}

// Localized display name for a city slug — labels internal links to the
// destinations detected in a blog post's text.
function cityNameForSlug(slug, lang) {
  const city = CITY_BY_SLUG[slug];
  return city ? resolveTranslation(city.translations, lang, city.name) : null;
}

// Map detected city slugs to the localized names of the countries they're in
// (drives "more articles from <country>"-style groupings).
function citiesToCountries(slugs, lang) {
  const set = {};
  (slugs || []).forEach((slug) => {
    const city = CITY_BY_SLUG[slug];
    const code = city && city.country_code;
    if (!code) return;
    const country = COUNTRY_BY_CODE[code];
    const name = resolveTranslation(country && country.translations, lang, code);
    if (name) set[name] = true;
  });
  return Object.keys(set);
}

module.exports = {
  setGeoData,
  localizeCity, localizeCountry, localizeAirport,
  getAlternativeAirports, buildIataNameMap, slugForIata,
  detectCitiesInText, citiesToCountries, cityNameForSlug,
};
