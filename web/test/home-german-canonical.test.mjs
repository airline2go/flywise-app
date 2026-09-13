// [GERMAN-CANONICAL-UNIFICATION] German has exactly ONE URL: the bare root `/`.
//
// Before this fix the homepage shipped a dual-canonical duplicate — `/`
// (canonical /) AND a distinct self-canonical `/de` — while the hreflang cluster
// pointed `de → /de`. That contradicted the two things that already commit to
// the root: the sitemap lists `/` (never `/de`) as the German home, and every
// SSR entity page's `de` alternate targets the unprefixed root (urlsFor →
// https://airpiv.com/<path>, no /de prefix). This suite locks the homepage to
// that same single German URL so the contradiction can't return.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pageUrls } from '../lib/sitemap-serialize.mjs';
import { HOME_LANGS } from '../lib/home-i18n.mjs';
import { urlsFor } from '../lib/legacy-render/languages.js';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(web, p), 'utf8');

test('public/index.html: German is self-consistent — canonical /, hreflang de → /, x-default → /', () => {
  const html = read('public/index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/" id="canonical-url">/);
  assert.match(html, /<link rel="alternate" hreflang="de" href="https:\/\/airpiv\.com\/">/);
  assert.match(html, /<link rel="alternate" hreflang="x-default" href="https:\/\/airpiv\.com\/">/);
  // The retired second German URL must not reappear anywhere in the head cluster.
  assert.doesNotMatch(html, /hreflang="de" href="https:\/\/airpiv\.com\/de"/);
});

test('German is not a generated prefixed home', () => {
  assert.ok(!HOME_LANGS.includes('de'), 'de must not be in HOME_LANGS (root serves German verbatim)');
});

test('sitemap lists the bare root / as the German home, never /de', () => {
  const locs = pageUrls().map((u) => u.loc);
  assert.ok(locs.includes('https://airpiv.com/'), 'sitemap must list the root /');
  assert.ok(!locs.includes('https://airpiv.com/de'), 'sitemap must not list /de');
});

test('every SSR page points its de alternate at the unprefixed root (matches the homepage)', () => {
  // urlsFor is the single source of truth for SSR hreflang clusters. German is
  // unprefixed there; the homepage must agree — which it now does.
  const urls = urlsFor('flights/hamburg-barcelona');
  assert.equal(urls.de, 'https://airpiv.com/flights/hamburg-barcelona');
  assert.ok(!urls.de.includes('/de/'), 'de alternate must never carry a /de prefix');
});

test('next.config.mjs: /de 301-redirects to / and is not a rewritten home', () => {
  const cfg = read('next.config.mjs');
  // A permanent redirect from /de to the root.
  assert.match(cfg, /source:\s*'\/de'[\s\S]*?destination:\s*'\/'[\s\S]*?statusCode:\s*301/);
  // de is not in the localized-home rewrite list.
  assert.match(cfg, /const LANG_HOMES = \['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'\];/);
});
