// [P1.9/P5.1] The static homepage footer is authored in German. Every localized
// home (/en, /ar, /es, /fr, /it, /nl, /tr) must render the footer in ITS OWN
// language in the raw/SSR HTML (no client JS), with the shared structure kept,
// Arabic in RTL, and NO German footer text leaking into a non-German page.
// URLs must be unchanged (German-only destinations may remain; no invented
// localized URLs). This runs the real transform over the real public/index.html,
// so it doubles as offline raw-HTML verification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { localizeHomeHtml, extractTranslations, FOOTER_I18N, HOME_LANGS } from '../lib/home-i18n.mjs';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const INDEX = readFileSync(join(pub, 'index.html'), 'utf8');
const TRANSLATIONS = extractTranslations(readFileSync(join(pub, 'app.js'), 'utf8'));

const footerOf = (html) => {
  const m = html.match(/<footer[\s\S]*?<\/footer>/i);
  assert.ok(m, 'footer present');
  return m[0];
};

// German-only sentinels that must NOT survive in a non-German footer (none are
// city names, so P5.1's city-name exemption does not apply).
const GERMAN_FOOTER_SENTINELS = ['Entdecken', 'Unternehmen', 'Über uns', 'Mietwagen', 'Alle Rechte vorbehalten', 'Cookie-Richtlinie'];

test('every home language is covered by reviewed footer translations', () => {
  for (const lang of HOME_LANGS) {
    assert.ok(FOOTER_I18N[lang], `FOOTER_I18N missing ${lang}`);
    // same key set as German (no missing/extra key silently falling back)
    assert.deepEqual(Object.keys(FOOTER_I18N[lang]).sort(), Object.keys(FOOTER_I18N.de).sort(), `${lang} key set`);
  }
});

test('German home (/de) keeps the original German footer', () => {
  const f = footerOf(localizeHomeHtml(INDEX, 'de', TRANSLATIONS));
  assert.match(f, /Entdecken/);
  assert.match(f, /Alle Rechte vorbehalten/);
});

for (const lang of HOME_LANGS.filter((l) => l !== 'de')) {
  test(`${lang} home: footer is localized, no German leakage, structure + URLs intact`, () => {
    const html = localizeHomeHtml(INDEX, lang, TRANSLATIONS);
    const f = footerOf(html);
    const T = FOOTER_I18N[lang];

    // localized visible labels present (sample the distinctive ones)
    for (const key of ['ft_discover', 'ft_company', 'ft_support', 'ft_about', 'ft_contact', 'ft_copyright']) {
      assert.ok(f.includes(T[key]), `${lang} footer missing ${key} = "${T[key]}"`);
    }
    // no German footer sentinel leaked
    for (const g of GERMAN_FOOTER_SENTINELS) {
      assert.ok(!f.includes(g), `${lang} footer leaks German "${g}"`);
    }
    // structure kept: three column headings + tagline + legal
    assert.equal((f.match(/<h4/g) || []).length, 3, `${lang} footer column count`);
    assert.ok(f.includes(T.ft_legal.slice(0, 20)), `${lang} legal disclaimer localized`);

    // URLs unchanged: German-only destinations remain, no invented localized ones
    assert.match(f, /href="\/cheap-flights\.html"/);
    assert.match(f, /href="\/cookies\.html"/);
    assert.ok(!f.includes(`/${lang}/cheap-flights`), `${lang}: no invented localized static URL`);
  });
}

test('Arabic home is RTL at the document root (shared footer inherits direction)', () => {
  const html = localizeHomeHtml(INDEX, 'ar', TRANSLATIONS);
  assert.match(html, /<html\s+lang="ar"\s+dir="rtl"/);
  // a non-RTL language stays LTR
  assert.match(localizeHomeHtml(INDEX, 'en', TRANSLATIONS), /<html\s+lang="en"\s+dir="ltr"/);
});
