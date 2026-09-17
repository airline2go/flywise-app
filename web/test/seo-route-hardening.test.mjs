import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const shell = require('../lib/legacy-render/shell');
const expectedLanguages = ['en', 'de', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];

for (const lang of expectedLanguages) {
  const overrides = shell.ROUTE_COPY_OVERRIDES?.[lang];
  assert.ok(overrides, `missing route copy overrides for ${lang}`);
  assert.match(overrides.routeFaqFastestAnswer, /\{duration\}/);
  assert.doesNotMatch(overrides.routeFaqFastestAnswer.toLowerCase(), /nonstop|non-stop|direct flight|direct flights/);
  assert.equal(overrides.routeFaqBestTimeQuestion, '');
  assert.equal(overrides.routeFaqBestTimeAnswerShortHaul, '');
  assert.equal(overrides.routeFaqBestTimeAnswerMediumHaul, '');
  assert.equal(overrides.routeFaqBestTimeAnswerLongHaul, '');
  assert.equal(overrides.routeFaqCheapestQuestion, '');
  assert.equal(overrides.routeFaqCheapestAnswer, '');
}

const rendererPath = path.resolve(process.cwd(), 'lib/legacy-render/render-flight-route.js');
const renderer = fs.readFileSync(rendererPath, 'utf8');
assert.ok(renderer.includes('const items = [haulQuestion];'));
assert.ok(!renderer.includes('const items = [bestTimeFaqItem, haulQuestion];'));
assert.ok(renderer.includes('if (Number.isFinite(Number(route.min_duration_min)) && Number(route.min_duration_min) > 0) {'));
assert.match(renderer, /function buildBestTimeHtml\(route, lang\) \{[\s\S]*?return '';[\s\S]*?\n\}/);

const sitemapPath = path.resolve(process.cwd(), 'app/sitemap-shard/[file]/route.js');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemap.includes('export const revalidate = 900;'));
assert.ok(sitemap.includes("'cache-control': 'public, max-age=900, stale-while-revalidate=86400',"));
