// Ported from flywise-app/build/translate.js — adapted from
// `fs.readFileSync` (batch-script style) to static ESM JSON imports,
// which Next.js's bundler (both webpack and Turbopack) handles natively.
// The dictionaries are still loaded once at module init and never
// mutated afterward, so this remains just as safe to share across
// concurrent requests as the original.
import { DEFAULT_LANGUAGE } from './languages';
import de from '../translations/de.json';
import en from '../translations/en.json';
import ar from '../translations/ar.json';
import es from '../translations/es.json';
import fr from '../translations/fr.json';
import it from '../translations/it.json';
import nl from '../translations/nl.json';

const DICTS = { de, en, ar, es, fr, it, nl };

// [I18N-FALLBACK] language -> English -> German -> the raw key itself.
// English is the fallback-of-first-resort (not German) because it's the
// platform's most complete secondary language and the one most likely to
// still make sense to a reader of any of the other 5 non-German languages.
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
// on.
function format(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}

// Convenience: resolve every key for a language at once — used for the
// fixed nav/footer chrome shared by every page.
function stringsFor(lang) {
  const out = {};
  Object.keys(DICTS.en).forEach((k) => { out[k] = translate(k, lang); });
  return out;
}

export { translate, format, stringsFor, DICTS };
