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
  assert.match(overrides.routeFaqFastestAnswer, /\{duration\}/, `fastest FAQ must interpolate duration for ${lang}`);
  assert.doesNotMatch(overrides.routeFaqFastestAnswer.toLowerCase(), /nonstop|non-stop|direct flight|direct flights/, `fastest FAQ must not infer nonstop/direct service for ${lang}`);
  assert.equal(overrides.routeFaqBestTimeQuestion, '', `best-time question must be disabled for ${lang}`);
  assert.equal(overrides.routeFaqBestTimeAnswerShortHaul, '', `short-haul booking advice must be disabled for ${lang}`);
  assert.equal(overrides.routeFaqBestTimeAnswerMediumHaul, '', `medium-haul booking advice must be disabled for ${lang}`);
  assert.equal(overrides.routeFaqBestTimeAnswerLongHaul, '', `long-haul booking advice must be disabled for ${lang}`);
  assert.equal(overrides.routeFaqCheapestQuestion, '', `cheapest-day question must be disabled for ${lang}`);
  assert.equal(overrides.routeFaqCheapestAnswer, '', `cheapest-day answer must be disabled for ${lang}`);
}

const rendererPath = path.resolve(process.cwd(), 'lib/legacy-render/render-flight-route.js');
const renderer = fs.readFileSync(rendererPath, 'utf8');
assert.ok(renderer.includes('const items = [haulQuestion];'), 'generated FAQ must not include legacy best-time/cheapest item');
assert.ok(!renderer.includes('const items = [bestTimeFaqItem, haulQuestion];'), 'legacy booking-advice FAQ item is still wired into generated FAQ');
assert.ok(renderer.includes('if (Number.isFinite(Number(route.min_duration_min)) && Number(route.min_duration_min) > 0) {'), 'fastest FAQ must be gated by a positive persisted duration');
assert.ok(!renderer.includes('route.min_duration_min < route.avg_duration_min'), 'fastest FAQ must not infer nonstop from min < average duration');
assert.match(renderer, /function buildBestTimeHtml\(route, lang\) \{[\s\S]*?return '';[\s\S]*?\n\}/, 'legacy booking-window HTML generator must be disabled without historical evidence');

const sitemapPath = path.resolve(process.cwd(), 'app/sitemap-shard/[file]/route.js');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemap.includes('export const revalidate = 900;'), 'route child sitemap revalidation must be 15m');
assert.ok(sitemap.includes("'cache-control': 'public, max-age=900, stale-while-revalidate=86400',"), 'route child sitemap cache header must be 15m');
