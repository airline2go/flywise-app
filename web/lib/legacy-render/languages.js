// Canonical list of the platform's 7 languages — the single source of
// truth for build/generate-pages.js and every render-*.js file. Adding
// language #8 in the future means adding one entry here (plus a
// translations/{code}.json file and DB-side translation rows) instead of
// touching every render file's ternary branches.
//
// `code` is the bare language code used in URLs (/en/..., /ar/...) and as
// the `lang` attribute; `locale` is the full BCP-47 tag used for
// Intl.NumberFormat/toLocaleString-style formatting and JSON-LD
// `inLanguage`; `direction` drives `dir="rtl"|"ltr"` on every page shell.
const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-US', direction: 'ltr' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE', direction: 'ltr' },
  { code: 'ar', name: 'العربية', locale: 'ar-SA', direction: 'rtl' },
  { code: 'es', name: 'Español', locale: 'es-ES', direction: 'ltr' },
  { code: 'fr', name: 'Français', locale: 'fr-FR', direction: 'ltr' },
  { code: 'it', name: 'Italiano', locale: 'it-IT', direction: 'ltr' },
  { code: 'nl', name: 'Nederlands', locale: 'nl-NL', direction: 'ltr' },
];

// German is the platform's original/default language and keeps its
// existing unprefixed root path (/city/munich) so already-indexed URLs
// are never disrupted — every other language gets a /xx/ prefix tree,
// exactly mirroring how /en/ already worked before this file existed.
const DEFAULT_LANGUAGE = 'de';

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE);
}

// URL path prefix for a given language — '' for the default language
// (root), 'xx' for every other one.
function pathPrefix(code) {
  return code === DEFAULT_LANGUAGE ? '' : code;
}

// Root-relative path for a given language + relative path segment, e.g.
// pathFor('en', 'city/london') -> '/en/city/london', pathFor('de', 'city/london') -> '/city/london'.
function pathFor(code, relativePath) {
  const prefix = pathPrefix(code);
  return `/${prefix ? prefix + '/' : ''}${relativePath}`;
}

// Full absolute URL, same rules as pathFor().
function urlFor(code, relativePath) {
  return `https://airpiv.com${pathFor(code, relativePath)}`;
}

// The same relativePath's full URL in every one of the 7 languages —
// exactly what renderShell()'s `urls` param (hreflang/hrefLang) expects.
function urlsFor(relativePath) {
  const out = {};
  LANGUAGES.forEach((l) => { out[l.code] = urlFor(l.code, relativePath); });
  return out;
}

module.exports = { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, getLanguage, pathPrefix, pathFor, urlFor, urlsFor };
