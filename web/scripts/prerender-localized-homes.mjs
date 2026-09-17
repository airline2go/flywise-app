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
//   index.html verbatim (canonical /).
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

const SENTINEL_KEYS = ['hero_title1', 'hero_pill', 'search_btn'];
const HOME_LOCALES = {
  de: 'de-DE', en: 'en-US', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', nl: 'nl-NL', tr: 'tr-TR',
};

// Keep the German homepage description within a normal search-snippet length.
// The message remains strictly limited to product capabilities already stated
// elsewhere on the homepage; no new commercial or price claim is introduced.
const GERMAN_HOME_DESCRIPTION = 'Günstige Flüge suchen, vergleichen und buchen auf Airpiv. Vergleichen Sie Flugtickets weltweit, finden Sie Last-Minute-Angebote und transparente Preise.';

function homeMeta(lang) {
  const base = HOME_META[lang];
  if (!base) throw new Error(`unknown home language: ${lang}`);
  return lang === 'de' ? { ...base, d: GERMAN_HOME_DESCRIPTION } : base;
}

function assertTranslationsComplete(translations) {
  for (const lang of HOME_LANGS) {
    if (!translations[lang] || typeof translations[lang] !== 'object') {
      throw new Error(`TRANSLATIONS is missing language \"${lang}\"`);
    }
  }
  for (const lang of HOME_LANGS) {
    if (lang === 'de') continue;
    for (const key of SENTINEL_KEYS) {
      const val = translate(translations, lang, key);
      const de = translate(translations, 'de', key);
      if (!val || val === key) throw new Error(`\"${lang}\" has no translation for sentinel key \"${key}\"`);
      if (val === de) throw new Error(`\"${lang}\" sentinel \"${key}\" equals German (\"${de}\") — not localized`);
    }
  }
}

function transformJsonLdBlock(block, lang, state) {
  const open = block.match(/^\s*<script\b[^>]*type=\"application\/ld\+json\"[^>]*>/i)?.[0] || '<script type="application/ld+json">';
  const close = /<\/script>\s*$/i.test(block) ? '</script>' : '</script>';
  const body = block.slice(open.length, block.length - close.length).trim();
  let data;
  try { data = JSON.parse(body); } catch { return block; }

  const canonical = lang === 'de' ? `${SITE}/` : `${SITE}/${lang}`;
  const locale = HOME_LOCALES[lang] || 'de-DE';
  const meta = homeMeta(lang);
  const list = Array.isArray(data) ? data : [data];
  const kept = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') {
      kept.push(item);
      continue;
    }
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];

    if (types.includes('Organization')) {
      if (Array.isArray(item.sameAs) && item.sameAs.length === 0) delete item.sameAs;
      if (item.contactPoint && Array.isArray(item.contactPoint.availableLanguage) && !item.contactPoint.availableLanguage.includes('Turkish')) {
        item.contactPoint.availableLanguage.push('Turkish');
      }
    }

    if (types.includes('WebPage')) {
      item.url = canonical;
      item.name = meta.t;
      item.description = meta.d;
      item.inLanguage = locale;
      if (typeof item['@id'] === 'string' && item['@id'].endsWith('#webpage')) item['@id'] = `${canonical}#webpage`;
    }

    if (types.includes('WebSite')) {
      if (state.seenWebsite) continue;
      state.seenWebsite = true;
      item.inLanguage = locale;
      item.description = meta.d;
    }

    kept.push(item);
  }

  if (kept.length === 0) return '';
  const out = Array.isArray(data) ? kept : kept[0];
  return `${open}\n${JSON.stringify(out, null, 2)}\n${close}`;
}

function hardenHomeSeoHtml(html, lang) {
  const state = { seenWebsite: false };
  let out = html.replace(
    /<script\b[^>]*type=\"application\/ld\+json\"[^>]*>[\s\S]*?<\/script>/gi,
    (block) => transformJsonLdBlock(block, lang, state),
  );

  const meta = homeMeta(lang);
  if (lang === 'de') {
    out = out.replace(/(<meta\s+name=\"description\"\s+content=\")[^\"]*(\")/i, (_x, a, b) => a + meta.d + b);
    out = out.replace(/(<meta\s+property=\"og:description\"\s+content=\")[^\"]*(\")/i, (_x, a, b) => a + meta.d + b);
    out = out.replace(/(<meta\s+name=\"twitter:description\"\s+content=\")[^\"]*(\")/i, (_x, a, b) => a + meta.d + b);
  }

  // The confirmation state is hidden until a successful booking flow and must
  // not compete with the single semantic homepage H1. Keep the visual markup
  // unchanged while making the heading hierarchy unambiguous to crawlers.
  out = out.replace(/<h1(\b[^>]*data-i18n=\"confirm_title\"[^>]*)>/gi, '<h2$1>');

  const pageMap = { about: '/about.html', contact: '/contact.html', privacy: '/privacy.html', terms: '/terms.html' };
  out = out.replace(/<a\b[^>]*>/gi, (tag) => {
    const arg = tag.match(/\bdata-fn-arg=\"(about|contact|privacy|terms)\"/i)?.[1];
    if (arg && /\bhref=\"#\"/i.test(tag)) return tag.replace(/\bhref=\"#\"/i, `href=\"${pageMap[arg]}\"`);
    if (/\bclass=\"[^\"]*\blogo\b[^\"]*\"/i.test(tag) && /\bhref=\"#\"/i.test(tag)) return tag.replace(/\bhref=\"#\"/i, `href=\"${lang === 'de' ? `${SITE}/` : `${SITE}/${lang}`}\"`);
    return tag;
  });

  return out;
}

function assertGeneratedFile(html, lang, translations, expectedCanonical = `${SITE}/${lang}`) {
  const url = expectedCanonical;
  const meta = homeMeta(lang);
  if (!new RegExp(`<html\\s+lang=\"${lang}\"`).test(html)) throw new Error(`${lang}: <html lang> is not \"${lang}\"`);
  if (!html.includes(`href=\"${url}\" id=\"canonical-url\"`)) throw new Error(`${lang}: canonical is not self (${url})`);
  if (!html.includes(`<title>${escText(meta.t)}</title>`)) throw new Error(`${lang}: <title> not localized`);
  if (!html.includes('hreflang=\"de\" href=\"https://airpiv.com/\"')) throw new Error(`${lang}: hreflang de not root /`);
  if (html.includes('hreflang=\"de\" href=\"https://airpiv.com/de\"')) throw new Error(`${lang}: hreflang de still points at retired /de`);
  if (lang !== 'de') {
    if (html.includes(`<title>${escText(HOME_META.de.t)}</title>`)) throw new Error(`${lang}: German <title> leaked`);
    const heroTitle = escText(translate(translations, lang, 'hero_title1'));
    if (!html.includes(heroTitle)) throw new Error(`${lang}: localized H1 sentinel \"${heroTitle}\" missing from body`);
  }
  const websiteCount = (html.match(/\"@type\":\s*\"WebSite\"/g) || []).length;
  if (websiteCount !== 1) throw new Error(`${lang}: expected exactly one WebSite JSON-LD node, found ${websiteCount}`);
  if (html.includes('\"sameAs\": []')) throw new Error(`${lang}: empty Organization sameAs must not be emitted`);
  if (!html.includes('\"availableLanguage\": [') || !html.includes('\"Turkish\"')) throw new Error(`${lang}: Organization availableLanguage missing Turkish`);
  if (!html.includes(`\"inLanguage\": \"${HOME_LOCALES[lang]}\"`)) throw new Error(`${lang}: WebPage language is not localized`);
  if (!html.includes(`\"name\": ${JSON.stringify(meta.t)}`)) throw new Error(`${lang}: WebPage JSON-LD name not localized`);
  if (!html.includes(`\"description\": ${JSON.stringify(meta.d)}`)) throw new Error(`${lang}: WebPage JSON-LD description not localized`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) throw new Error(`${lang}: expected exactly one <h1>`);
  const knownAnchors = Object.values({ about: '/about.html', contact: '/contact.html', privacy: '/privacy.html', terms: '/terms.html' });
  for (const href of knownAnchors) {
    if (html.includes(`data-fn-arg=\"${href.slice(1, -5)}\" href=\"#\"`)) throw new Error(`${lang}: known internal page still uses href=\"#\" (${href})`);
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

  const rootHtml = hardenHomeSeoHtml(localizeHomeHtml(src, 'de', translations), 'de');
  assertGeneratedFile(rootHtml, 'de', translations, `${SITE}/`);
  writeFileSync(indexPath, rootHtml);

  let wrote = 0;
  for (const lang of HOME_LANGS) {
    const html = hardenHomeSeoHtml(localizeHomeHtml(src, lang, translations), lang);
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
    process.exit(1);
  }
}

export { main };
