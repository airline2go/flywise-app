import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('route handlers wire the persisted-price SSR enhancement', () => {
  const localized = read('app/[lang]/flights/[slug]/route.js');
  const german = read('app/(de)/flights/[slug]/route.js');
  assert.match(localized, /renderCanonicalRoutePriceHtml/);
  assert.match(localized, /renderCanonicalRoutePriceHtml\(html, slug, lang\)/);
  assert.match(german, /renderCanonicalRoutePriceHtml/);
  assert.match(german, /renderCanonicalRoutePriceHtml\(html, slug, 'de'\)/);
});

test('SSR price enhancer fails closed when route data or expected markup is unavailable', () => {
  const source = read('lib/legacy-render/route-html-enhance.js');
  assert.match(source, /if \(!route\) return html/);
  assert.match(source, /if \(!formatted\) return html/);
  assert.match(source, /if \(!pattern\.test\(html\)\) return html/);
  assert.match(source, /buildRouteSnapshot\(route\)/);
});
