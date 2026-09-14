const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('./languages');

// Loaded once at module init. Static require() (rather than the build
// script's fs.readFileSync) so the bundler traces and includes each JSON in
// the serverless output — the values, and therefore the rendered HTML, are
// byte-for-byte the same as the build-time renderer's.
const DICTS = {
  en: require('../../translations/en.json'),
  de: require('../../translations/de.json'),
  ar: require('../../translations/ar.json'),
  es: require('../../translations/es.json'),
  fr: require('../../translations/fr.json'),
  it: require('../../translations/it.json'),
  nl: require('../../translations/nl.json'),
  tr: require('../../translations/tr.json'),
};
// Guard: keep the DICTS map in lock-step with the canonical language list.
LANGUAGE_CODES.forEach((code) => {
  if (!DICTS[code]) throw new Error(`legacy-render/translate: missing translations for "${code}"`);
});

// [SEO-ROUTE-TEMPLATES] Route pages target a very explicit search intent:
// users want flights FROM one city TO another and want to compare fares and
// airlines. Keep the primary query terms near the beginning of title/description
// and avoid promising "book" functionality on a page whose primary CTA is
// flight search/comparison. These are localized per language rather than
// translating only the surrounding chrome.
const ROUTE_SEO_TEMPLATES = {
  en: {
    routeTitleTemplate: 'Cheap flights from {origin} to {destination} | Compare prices & airlines',
    routeDescriptionTemplate: 'Compare cheap flights from {origin} ({originCode}) to {destination} ({destCode}). See airlines, flight times and available fares with Airpiv.',
  },
  de: {
    routeTitleTemplate: 'Günstige Flüge von {origin} nach {destination} | Preise & Airlines vergleichen',
    routeDescriptionTemplate: 'Vergleiche günstige Flüge von {origin} ({originCode}) nach {destination} ({destCode}). Sieh Airlines, Flugzeiten und verfügbare Preise mit Airpiv.',
  },
  ar: {
    routeTitleTemplate: 'رحلات طيران رخيصة من {origin} إلى {destination} | قارن الأسعار وشركات الطيران',
    routeDescriptionTemplate: 'قارن الرحلات الرخيصة من {origin} ({originCode}) إلى {destination} ({destCode}). شاهد شركات الطيران وأوقات الرحلات والأسعار المتاحة عبر Airpiv.',
  },
  es: {
    routeTitleTemplate: 'Vuelos baratos de {origin} a {destination} | Compara precios y aerolíneas',
    routeDescriptionTemplate: 'Compara vuelos baratos de {origin} ({originCode}) a {destination} ({destCode}). Consulta aerolíneas, duración y precios disponibles con Airpiv.',
  },
  fr: {
    routeTitleTemplate: 'Vols pas chers de {origin} à {destination} | Comparez prix et compagnies',
    routeDescriptionTemplate: 'Comparez les vols pas chers de {origin} ({originCode}) à {destination} ({destCode}). Consultez les compagnies, durées de vol et tarifs disponibles avec Airpiv.',
  },
  it: {
    routeTitleTemplate: 'Voli economici da {origin} a {destination} | Confronta prezzi e compagnie',
    routeDescriptionTemplate: 'Confronta voli economici da {origin} ({originCode}) a {destination} ({destCode}). Scopri compagnie, durata del volo e tariffe disponibili con Airpiv.',
  },
  nl: {
    routeTitleTemplate: 'Goedkope vluchten van {origin} naar {destination} | Vergelijk prijzen en airlines',
    routeDescriptionTemplate: 'Vergelijk goedkope vluchten van {origin} ({originCode}) naar {destination} ({destCode}). Bekijk airlines, vliegtijden en beschikbare prijzen met Airpiv.',
  },
  tr: {
    routeTitleTemplate: '{origin} - {destination} ucuz uçuşlar | Fiyatları ve havayollarını karşılaştır',
    routeDescriptionTemplate: '{origin} ({originCode}) - {destination} ({destCode}) ucuz uçuşları karşılaştırın. Havayollarını, uçuş sürelerini ve mevcut fiyatları Airpiv ile görün.',
  },
};

// [I18N-FALLBACK] language -> English -> German -> the raw key itself.
// English is the fallback-of-first-resort (not German) because it's the
// platform's most complete secondary language and the one most likely to
// still make sense to a reader of any of the other 5 non-German languages,
// mirroring app.js's own t()/tL() fallback chain shape.
function translate(key, lang) {
  const seoTemplate = ROUTE_SEO_TEMPLATES[lang] && ROUTE_SEO_TEMPLATES[lang][key];
  if (seoTemplate) return seoTemplate;
  const dict = DICTS[lang];
  if (dict && dict[key] != null) return dict[key];
  if (DICTS.en && DICTS.en[key] != null) return DICTS.en[key];
  if (DICTS[DEFAULT_LANGUAGE] && DICTS[DEFAULT_LANGUAGE][key] != null) return DICTS[DEFAULT_LANGUAGE][key];
  return key;
}

// Fills `{placeholder}` tokens in a translated template string with the
// given values — the small templating layer the phrase-bank content
// (route/city/country/airport titles, descriptions, FAQ, intros) is built
// on, replacing the old `de ? '...' : '...'` literal-string branches.
function format(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}

// Convenience: resolve every key for a language at once — used by
// shell.js for the fixed nav/footer chrome.
function stringsFor(lang) {
  const out = {};
  Object.keys(DICTS.en).forEach((k) => { out[k] = translate(k, lang); });
  return out;
}

module.exports = { translate, format, stringsFor, DICTS };
