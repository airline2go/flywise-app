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

// [I18N-FALLBACK] language -> English -> German -> the raw key itself.
// English is the fallback-of-first-resort (not German) because it's the
// platform's most complete secondary language and the one most likely to
// still make sense to a reader of any of the other 5 non-German languages,
// mirroring app.js's own t()/tL() fallback chain shape.
function translate(key, lang) {
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
