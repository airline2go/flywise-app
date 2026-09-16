import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('route discovery hub exposes only canonical indexable routes and paginates at 500', () => {
  const helper = read('lib/legacy-render/route-sitemap.js');
  const renderer = read('lib/legacy-render/render-route-sitemap.js');
  assert.match(helper, /route\.indexable !== false/);
  assert.match(helper, /!loserMap\.has\(route\.slug\)/);
  assert.match(helper, /ROUTES_PER_PAGE/);
  assert.match(renderer, /const ROUTES_PER_PAGE = 500/);
  assert.match(renderer, /rel=\\"prev\\"/);
  assert.match(renderer, /rel=\\"next\\"/);
});

test('XML sitemap seeds every language into the route discovery graph', () => {
  const source = read('lib/sitemap-urls.js');
  assert.match(source, /urlFor\(lang, 'sitemap\/routes\/1'\)/);
});

test('German and localized route discovery handlers validate page and language', () => {
  const de = read('app/sitemap/routes/[page]/route.js');
  const localized = read('app/[lang]/sitemap/routes/[page]/route.js');
  assert.match(de, /getRouteSitemapPage\(page\)/);
  assert.match(de, /renderRouteSitemapPage/);
  assert.match(localized, /isPrefixedLang\(lang\)/);
  assert.match(localized, /getRouteSitemapPage\(page\)/);
});
