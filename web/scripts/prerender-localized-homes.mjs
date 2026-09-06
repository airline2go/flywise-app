// [P2-4] Runs LAST in the build chain (after stamp-assets stamped index.html).
//
// Emits a fully-localized public/<lang>.html for each of the 8 home languages,
// derived from the (popular-routes-injected + asset-stamped) public/index.html:
//   • head localized (html lang / title / description / OG / Twitter / self
//     canonical) — mirrors canonical-fix.js, and
//   • body localized by re-applying app.js's own TRANSLATIONS dictionary to the
//     [data-i18n] / [data-i18n-placeholder] elements (H1, hero, tabs, nav, search
//     form, chips, footer …), so the raw HTML Googlebot sees on /en, /ar, …, /de
//     is correct on first byte instead of German fixed up later by JavaScript.
//   next.config.mjs rewrites /<lang> → /<lang>.html. The bare root / still serves
//   index.html verbatim (canonical /); /de is a distinct self-canonical German page.
//
// FAIL LOUDLY (per spec): if the dictionary can't be extracted, a required
// language is missing/untranslated, or a generated file fails its self-check,
// this EXITS NON-ZERO so `next build` never proceeds with a silent German
// fallback. There is deliberately no German-copy fallback here.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  HOME_LANGS, HOME_META, SITE, localizeHomeHtml, extractTranslations, translate, escText,
} from '../lib/home-i18n.mjs';

// Keys that must be genuinely localized (non-German) for every non-de language —
// the sentinels that catch a language silently falling back to German content.
const SENTINEL_KEYS = ['hero_title1', 'hero_pill', 'search_btn'];

function assertTranslationsComplete(translations) {
  for (const lang of HOME_LANGS) {
    if (!translations[lang] || typeof translations[lang] !== 'object') {
      throw new Error(`TRANSLATIONS is missing language "${lang}"`);
    }
  }
  for (const lang of HOME_LANGS) {
    if (lang === 'de') continue;
    for (const key of SENTINEL_KEYS) {
      const val = translate(translations, lang, key);
      const de = translate(translations, 'de', key);
      if (!val || val === key) throw new Error(`"${lang}" has no translation for sentinel key "${key}"`);
      if (val === de) throw new Error(`"${lang}" sentinel "${key}" equals German ("${de}") — not localized`);
    }
  }
}

// Self-check a generated file's raw HTML before we let the build continue.
function assertGeneratedFile(html, lang, translations) {
  const url = `${SITE}/${lang}`;
  if (!new RegExp(`<html\\s+lang="${lang}"`).test(html)) throw new Error(`${lang}.html: <html lang> is not "${lang}"`);
  if (!html.includes(`href="${url}" id="canonical-url"`)) throw new Error(`${lang}.html: canonical is not self (${url})`);
  if (!html.includes(`<title>${escText(HOME_META[lang].t)}</title>`)) throw new Error(`${lang}.html: <title> not localized`);
  // hreflang cluster consistency: de alternate must point at /de.
  if (!html.includes('hreflang="de" href="https://airpiv.com/de"')) throw new Error(`${lang}.html: hreflang de not /de`);
  if (lang !== 'de') {
    // The German homepage title/description must NOT survive in another language.
    if (html.includes(`<title>${escText(HOME_META.de.t)}</title>`)) throw new Error(`${lang}.html: German <title> leaked`);
    // A localized body sentinel must be present (proves the body was localized).
    const heroTitle = escText(translate(translations, lang, 'hero_title1'));
    if (!html.includes(heroTitle)) throw new Error(`${lang}.html: localized H1 sentinel "${heroTitle}" missing from body`);
  }
}

function main() {
  const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const publicDir = join(webDir, 'public');
  const indexPath = join(publicDir, 'index.html');
  const appJsPath = join(publicDir, 'app.js');
  if (!existsSync(indexPath)) throw new Error('public/index.html not found');
  if (!existsSync(appJsPath)) throw new Error('public/app.js not found (needed for TRANSLATIONS)');

  const src = readFileSync(indexPath, 'utf8');
  const appJs = readFileSync(appJsPath, 'utf8');
  const translations = extractTranslations(appJs);
  assertTranslationsComplete(translations);

  let wrote = 0;
  for (const lang of HOME_LANGS) {
    const html = localizeHomeHtml(src, lang, translations);
    assertGeneratedFile(html, lang, translations);
    writeFileSync(join(publicDir, `${lang}.html`), html);
    wrote++;
  }
  if (wrote !== HOME_LANGS.length) throw new Error(`only wrote ${wrote}/${HOME_LANGS.length} localized home files`);
  console.log(`[prerender-localized-homes] wrote + verified ${wrote}/${HOME_LANGS.length} localized home files: ${HOME_LANGS.join(', ')}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error('[prerender-localized-homes] FATAL:', err && err.message);
    process.exit(1); // fail the build — never deploy a silent German fallback
  }
}

export { main };
