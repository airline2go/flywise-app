// [P1.5] Legal/utility pages are not SEO landing pages: they must render
// `noindex, follow` AND be absent from the sitemap. Trust/authority pages are
// real content: they stay `index, follow` AND in the sitemap. This pins the
// core contract — sitemap membership == renderer indexability — for the static
// pages, so the two can never drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STATIC_PAGES } from '../lib/sitemap-serialize.mjs';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const robotsOf = (file) => {
  const html = readFileSync(join(pub, file), 'utf8');
  const m = html.match(/<meta name="robots" content="([^"]*)"/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};

const LEGAL_NOINDEX = ['cookies.html', 'terms.html', 'refund-policy.html', 'privacy.html'];
const TRUST_INDEX = ['about.html', 'how-it-works.html', 'data-sources.html', 'methodology.html', 'editorial-policy.html', 'transparency.html'];

test('legal/utility pages render noindex,follow and are NOT in the sitemap', () => {
  for (const p of LEGAL_NOINDEX) {
    assert.equal(robotsOf(p), 'noindex, follow', `${p} robots`);
    assert.ok(!STATIC_PAGES.includes(p), `${p} must not be in STATIC_PAGES (sitemap)`);
  }
});

test('trust/authority pages render index,follow and ARE in the sitemap', () => {
  for (const p of TRUST_INDEX) {
    assert.equal(robotsOf(p), 'index, follow', `${p} robots`);
    assert.ok(STATIC_PAGES.includes(p), `${p} must be in STATIC_PAGES (sitemap)`);
  }
});

test('no sitemap static page renders noindex (membership == indexability)', () => {
  for (const p of STATIC_PAGES) {
    if (p === '' || p === 'blog') continue; // root + blog hub handled elsewhere
    assert.equal(robotsOf(p), 'index, follow', `${p} is in the sitemap but not index,follow`);
  }
});
