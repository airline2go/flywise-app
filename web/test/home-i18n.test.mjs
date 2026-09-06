// [P2-4] The build-time localized home must be correct on first byte for all 8
// languages: self canonical, correct <html lang>, localized head (title/desc/OG/
// Twitter) AND localized body (H1, hero, nav, search form, placeholder) — with no
// German metadata leaking into another language. Pure transforms; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localizeHomeHtml, localizeBody, fixHreflangCluster, extractTranslations, translate,
  escText, escAttr, HOME_META, HOME_LANGS, SITE,
} from '../lib/home-i18n.mjs';

// A fixture that mirrors the real public/index.html head + the i18n body hooks.
const HOME = `<!DOCTYPE html>
<html lang="de" dir="ltr">
<head>
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha256-KEEPME='">
<script>try{if(localStorage.getItem('dm')==='1')document.documentElement.setAttribute('data-theme','dark');}catch(e){}</script>
<title>Airpiv | Günstige Flüge buchen & Flugtickets vergleichen</title>
<meta name="description" content="Günstige Flüge auf Airpiv.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://airpiv.com/" id="canonical-url">
<link rel="alternate" hreflang="de" href="https://airpiv.com/">
<link rel="alternate" hreflang="en" href="https://airpiv.com/en">
<link rel="alternate" hreflang="x-default" href="https://airpiv.com/">
<meta property="og:title" content="Airpiv | Günstige Flüge buchen & Flugtickets vergleichen">
<meta property="og:description" content="Günstige Flüge suchen und buchen auf Airpiv.">
<meta property="og:url" content="https://airpiv.com">
<meta property="og:locale" content="de_DE">
<meta name="twitter:title" content="Airpiv – Flüge vergleichen & buchen">
<meta name="twitter:description" content="Günstige Flüge auf Airpiv.">
<meta name="twitter:url" content="https://airpiv.com">
</head>
<body>
<a href="#" data-i18n="nav_flights">✈ Flüge</a>
<h1><span data-i18n="hero_title1">Günstige Flüge suchen</span><br><span data-i18n="hero_title2">und weltweit</span></h1>
<p class="hero-sub" data-i18n="hero_sub">Vergleiche hunderte Airlines.</p>
<div class="chip" data-i18n="sfb_direct">✈ Direktflug <b>x</b></div>
<input id="from-in" placeholder="Von — Stadt" data-i18n-placeholder="from_placeholder">
<svg viewBox="0 0 5 3"><rect width="5" height="3" fill="#000"/></svg>
</body>
</html>`;

// A tiny TRANSLATIONS dictionary covering the fixture's keys, for all 8 langs.
function T() {
  const langs = {};
  const per = {
    de: { nav_flights: '✈ Flüge', hero_title1: 'Günstige Flüge suchen', hero_title2: 'und weltweit', hero_sub: 'Vergleiche hunderte Airlines.', sfb_direct: '✈ Direktflug', from_placeholder: 'Von — Stadt', hero_pill: 'Echte Preise', search_btn: 'Suchen' },
    en: { nav_flights: '✈ Flights', hero_title1: 'Search cheap flights', hero_title2: 'and compare', hero_sub: 'Compare hundreds of airlines.', sfb_direct: '✈ Direct', from_placeholder: 'From — city', hero_pill: 'Real prices', search_btn: 'Search' },
  };
  for (const l of HOME_LANGS) {
    langs[l] = per[l] || Object.fromEntries(Object.entries(per.de).map(([k, v]) => [k, l === 'de' ? v : `${l}:${v}`]));
  }
  return langs;
}

test('all 8 languages get a self canonical + correct <html lang>', () => {
  const tr = T();
  for (const lang of HOME_LANGS) {
    const out = localizeHomeHtml(HOME, lang, tr);
    assert.match(out, new RegExp(`<html lang="${lang}" dir="ltr">`));
    assert.match(out, new RegExp(`href="${SITE}/${lang}" id="canonical-url"`));
  }
});

test('EN: head + body fully localized, German metadata does not leak', () => {
  const out = localizeHomeHtml(HOME, 'en', T());
  assert.match(out, /<title>Airpiv \| Book cheap flights &amp; compare airfares<\/title>/);
  assert.match(out, /<meta name="description" content="Search and book cheap flights[^"]*">/);
  assert.match(out, /<meta property="og:title" content="Airpiv \| Book cheap flights[^"]*">/);
  assert.match(out, /<meta property="og:locale" content="en_GB">/);
  assert.match(out, /<meta name="twitter:title" content="Airpiv \| Book cheap flights[^"]*">/);
  assert.match(out, /<meta property="og:url" content="https:\/\/airpiv\.com\/en">/);
  assert.match(out, /<meta name="twitter:url" content="https:\/\/airpiv\.com\/en">/);
  // Body: H1 spans, hero sub, nav — all English (from the dictionary).
  assert.match(out, /<span data-i18n="hero_title1">Search cheap flights<\/span>/);
  assert.match(out, /<span data-i18n="hero_title2">and compare<\/span>/);
  assert.match(out, /data-i18n="hero_sub">Compare hundreds of airlines\.</);
  assert.match(out, /data-i18n="nav_flights">✈ Flights</);
  // Placeholder attribute localized.
  assert.match(out, /placeholder="From — city"/);
  // No German homepage title/desc/H1 left anywhere.
  assert.doesNotMatch(out, /Günstige Flüge suchen/);
  assert.doesNotMatch(out, /Flüge vergleichen & buchen/);
});

test('body localization sets textContent (nested children are replaced, like applyTranslations)', () => {
  const out = localizeBody(HOME, 'en', T());
  // The chip had a nested <b>x</b>; app.js sets textContent, so it is gone.
  assert.match(out, /<div class="chip" data-i18n="sfb_direct">✈ Direct<\/div>/);
  assert.doesNotMatch(out, /✈ Direct <b>x<\/b>/);
});

test('CSP meta + hashed inline script are byte-identical after localization', () => {
  const out = localizeHomeHtml(HOME, 'ar', T());
  assert.match(out, /script-src 'self' 'sha256-KEEPME='/);
  assert.match(out, /try\{if\(localStorage\.getItem\('dm'\)==='1'\)/);
  // SVG flag preserved verbatim (no reserialization).
  assert.match(out, /<svg viewBox="0 0 5 3"><rect width="5" height="3" fill="#000"\/><\/svg>/);
});

test('DE is a distinct self-canonical German page (/de), body stays German', () => {
  const out = localizeHomeHtml(HOME, 'de', T());
  assert.match(out, /<html lang="de" dir="ltr">/);
  assert.match(out, /href="https:\/\/airpiv\.com\/de" id="canonical-url">/);
  assert.match(out, /<span data-i18n="hero_title1">Günstige Flüge suchen<\/span>/);
});

test('hreflang cluster: de → /de, x-default → root, on every page', () => {
  for (const lang of HOME_LANGS) {
    const out = localizeHomeHtml(HOME, lang, T());
    assert.match(out, /hreflang="de" href="https:\/\/airpiv\.com\/de"/);
    assert.match(out, /hreflang="x-default" href="https:\/\/airpiv\.com\/"/);
    assert.match(out, /hreflang="en" href="https:\/\/airpiv\.com\/en"/);
  }
});

test('fixHreflangCluster is idempotent (does not double-append /de)', () => {
  const once = fixHreflangCluster(HOME);
  const twice = fixHreflangCluster(once);
  assert.equal(once, twice);
  assert.match(twice, /hreflang="de" href="https:\/\/airpiv\.com\/de"/);
  assert.doesNotMatch(twice, /airpiv\.com\/de\/de/);
});

test('URLs are unchanged: no localized file rewrites an interior path or slug', () => {
  const out = localizeHomeHtml(HOME, 'fr', T());
  // Only the home URLs appear; nothing invents /fr/... interior paths.
  assert.doesNotMatch(out, /airpiv\.com\/fr\/[a-z]/);
});

test('extractTranslations pulls the TRANSLATIONS object out of app.js source', () => {
  const appJs = 'var x=1;TRANSLATIONS={"de":{"a":"A {brace}","b":"B"},"en":{"a":"EA","b":"EB"}};function t(){}';
  const tr = extractTranslations(appJs);
  assert.equal(tr.de.a, 'A {brace}'); // brace inside a string value handled
  assert.equal(tr.en.b, 'EB');
  assert.equal(translate(tr, 'en', 'a'), 'EA');
  assert.equal(translate(tr, 'fr', 'a'), 'A {brace}'); // German fallback
  assert.equal(translate(tr, 'en', 'missing'), 'missing'); // raw-key fallback
});

test('escapers behave (text vs attribute)', () => {
  assert.equal(escText('a & b < c >'), 'a &amp; b &lt; c &gt;');
  assert.equal(escAttr('x " & <'), 'x &quot; &amp; &lt;');
});

test('HOME_META covers every home language with title/description/og-locale', () => {
  for (const lang of HOME_LANGS) {
    assert.ok(HOME_META[lang], `missing HOME_META for ${lang}`);
    assert.ok(HOME_META[lang].t && HOME_META[lang].d && HOME_META[lang].ogl);
  }
});
