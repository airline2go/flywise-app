// [P2-4] The build-time localized home <head> must be correct on first byte:
// self canonical (not the German root), correct <html lang>, localized
// title/description/OG/Twitter — while the <body> stays byte-identical to the
// German home. Pure string transforms; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeHomeHtml, HOME_META, HOME_LANGS, escAttr } from '../lib/home-i18n.mjs';

// Minimal fixture mirroring the real public/index.html head contract.
const HOME = `<!DOCTYPE html>
<html lang="de" dir="ltr">
<head>
<title>Airpiv | Günstige Flüge buchen & Flugtickets vergleichen</title>
<meta name="description" content="Günstige Flüge auf Airpiv.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://airpiv.com/" id="canonical-url">
<link rel="alternate" hreflang="en" href="https://airpiv.com/en">
<meta property="og:title" content="Airpiv | Günstige Flüge buchen & Flugtickets vergleichen">
<meta property="og:description" content="Günstige Flüge suchen und buchen auf Airpiv.">
<meta property="og:url" content="https://airpiv.com">
<meta property="og:locale" content="de_DE">
<meta name="twitter:title" content="Airpiv – Flüge vergleichen & buchen">
<meta name="twitter:description" content="Günstige Flüge suchen und buchen auf Airpiv.">
<meta name="twitter:url" content="https://airpiv.com">
</head>
<body><main id="app">SPA-BODY</main></body>
</html>`;

test('English home: self canonical + localized head, body untouched', () => {
  const out = localizeHomeHtml(HOME, 'en');
  assert.match(out, /<html lang="en" dir="ltr">/);
  assert.match(out, /<link rel="canonical" href="https:\/\/airpiv\.com\/en" id="canonical-url">/);
  assert.match(out, new RegExp('<title>' + escAttr(HOME_META.en.t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</title>'));
  assert.match(out, /<meta name="description" content="Search and book cheap flights[^"]*">/);
  assert.match(out, /<meta property="og:url" content="https:\/\/airpiv\.com\/en">/);
  assert.match(out, /<meta property="og:locale" content="en_GB">/);
  assert.match(out, /<meta name="twitter:url" content="https:\/\/airpiv\.com\/en">/);
  // Twitter title is aligned to the OG/title (no German leftover).
  assert.doesNotMatch(out, /Flüge vergleichen & buchen/);
  // Body (the SPA) is preserved verbatim.
  assert.match(out, /<main id="app">SPA-BODY<\/main>/);
  // hreflang cluster is left intact (same self-referencing set on every page).
  assert.match(out, /hreflang="en" href="https:\/\/airpiv\.com\/en"/);
});

test('canonical never stays at the German root for any prefixed language', () => {
  for (const lang of HOME_LANGS) {
    const out = localizeHomeHtml(HOME, lang);
    assert.match(out, new RegExp(`href="https://airpiv\\.com/${lang}" id="canonical-url"`));
    assert.match(out, new RegExp(`<html lang="${lang}"`));
  }
});

test('attribute values are HTML-escaped (quotes/amp cannot break out)', () => {
  const out = localizeHomeHtml(HOME, 'fr');
  // French title contains an apostrophe — valid inside a double-quoted attr.
  assert.match(out, /<title>Airpiv \| Réservez des vols pas chers/);
  assert.equal(escAttr('a & b < c > "d"'), 'a &amp; b &lt; c &gt; &quot;d&quot;');
});

test('unknown language throws (caller falls back to verbatim copy)', () => {
  assert.throws(() => localizeHomeHtml(HOME, 'de'), /unknown home language/);
  assert.throws(() => localizeHomeHtml(HOME, 'zz'), /unknown home language/);
});
