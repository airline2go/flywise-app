// Tests for the §16 GSC opportunity classifier, the §7 normalization layer, and
// the §3/§4 report builder. Invariants (per the approved brief):
//   • Exact thresholds; NORMAL is the neutral bucket (a data-having row is never
//     forced into LOW); missing/invalid data → unknown, never a crash.
//   • Resolution priority BREAKOUT > VERY_HIGH > HIGH > LOW > NORMAL.
//   • Report sort order BREAKOUT > VERY_HIGH > HIGH > NORMAL > LOW, then
//     impressions desc, then best position.
//   • Per-URL clicks/CTR/primary-query are never fabricated when the export
//     lacks them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CATEGORY, classifyOpportunity, computeCtr, STATUS, STATUS_VALUES } = require('../lib/seo/gsc-opportunity.js');
const { normalizeGscRows, slugFromUrl, languageFromUrl } = require('../lib/seo/normalize.js');
const { buildOpportunityReport } = require('../lib/seo/report.js');
const { GSC_SAMPLE_ROWS, EXPECTED_CATEGORY } = require('./fixtures/gsc-sample.js');

const cat = (impressions, position) => classifyOpportunity({ impressions, position }).category;

// ─── Phase 17 lifecycle status enum ────────────────────────────────────────
test('STATUS enum covers the full Phase 17 lifecycle', () => {
  for (const s of ['NEW', 'ANALYZED', 'OPTIMIZATION_READY', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'MONITORING', 'WINNER', 'NEEDS_REWORK', 'REJECTED']) {
    assert.ok(STATUS_VALUES.includes(s), `missing status ${s}`);
    assert.equal(STATUS[s], s);
  }
});

// ─── §6 Boundary tests — every threshold edge from the brief ────────────────
test('19 impressions / position 10 → NORMAL (just under the HIGH impressions floor)', () => {
  assert.equal(cat(19, 10), CATEGORY.NORMAL);
});
test('20 impressions / position 15 → HIGH (inclusive floor + inclusive position)', () => {
  assert.equal(cat(20, 15), CATEGORY.HIGH);
});
test('40 impressions / position 12 → VERY_HIGH (both inclusive)', () => {
  assert.equal(cat(40, 12), CATEGORY.VERY_HIGH);
});
test('10 impressions / position 5 → BREAKOUT (both inclusive)', () => {
  assert.equal(cat(10, 5), CATEGORY.BREAKOUT);
});
test('9 impressions / position 5 → NORMAL (under BREAKOUT impressions, under HIGH impressions)', () => {
  assert.equal(cat(9, 5), CATEGORY.NORMAL);
});
test('4 impressions / position 26 → LOW', () => {
  assert.equal(cat(4, 26), CATEGORY.LOW);
});
test('position exactly 25 is NOT LOW (rule is strictly > 25)', () => {
  assert.equal(cat(3, 25), CATEGORY.NORMAL);
});

// ─── §2 Priority when multiple thresholds fire ─────────────────────────────
test('50 impressions / position 4 → BREAKOUT wins over VERY_HIGH/HIGH', () => {
  const o = classifyOpportunity({ impressions: 50, position: 4 });
  assert.equal(o.category, CATEGORY.BREAKOUT);
  assert.deepEqual(o.matched.slice().sort(), [CATEGORY.BREAKOUT, CATEGORY.HIGH, CATEGORY.VERY_HIGH].sort());
});
test('50 impressions / position 10 → VERY_HIGH (BREAKOUT not matched)', () => {
  assert.equal(cat(50, 10), CATEGORY.VERY_HIGH);
});
test('25 impressions / position 12 → HIGH', () => {
  assert.equal(cat(25, 12), CATEGORY.HIGH);
});

// ─── Malformed / missing / invalid input never crashes ─────────────────────
test('missing impressions → unknown category (null), no throw', () => {
  assert.equal(classifyOpportunity({ position: 10 }).category, null);
});
test('missing position → unknown category (null), no throw', () => {
  assert.equal(classifyOpportunity({ impressions: 40 }).category, null);
});
test('zero impressions is valid data: NORMAL, or LOW when deep', () => {
  assert.equal(cat(0, 10), CATEGORY.NORMAL);
  assert.equal(cat(0, 30), CATEGORY.LOW);
});
test('invalid (non-numeric) values → unknown, no throw', () => {
  assert.equal(classifyOpportunity({ impressions: 'abc', position: 'x' }).category, null);
  assert.equal(classifyOpportunity({}).category, null);
  assert.equal(classifyOpportunity(null).category, null);
  assert.equal(classifyOpportunity(undefined).category, null);
});

// ─── CTR is real-only ──────────────────────────────────────────────────────
test('computeCtr returns null when clicks unknown (never a fabricated 0%)', () => {
  assert.equal(computeCtr(null, 109), null);
  assert.equal(computeCtr(undefined, 109), null);
  assert.equal(computeCtr(3, 0), null);
  assert.equal(computeCtr(3, 100), 0.03);
});

// ─── §7 Normalization: URL parsing, language, dedupe/aggregation ───────────
test('slugFromUrl / languageFromUrl parse flights URLs and language prefixes', () => {
  assert.equal(slugFromUrl('https://airpiv.com/flights/ibiza-frankfurt'), 'ibiza-frankfurt');
  assert.equal(slugFromUrl('/en/flights/jfk-lax/'), 'jfk-lax');
  assert.equal(slugFromUrl('/city/berlin'), null);
  assert.equal(languageFromUrl('https://airpiv.com/flights/ibiza-frankfurt'), 'de');
  assert.equal(languageFromUrl('/es/flights/madrid-ibiza'), 'es');
});

test('normalizeGscRows dedupes duplicate/per-query rows into one aggregated per-URL row', () => {
  const raw = [
    { page: '/flights/ibiza-frankfurt', query: 'flugzeit ibiza frankfurt', impressions: 40, clicks: 1, position: 9 },
    { page: '/flights/ibiza-frankfurt', query: 'ibiza frankfurt flug', impressions: 30, clicks: 0, position: 12 },
    { page: '/flights/ibiza-frankfurt', query: 'wie lange fliegt man ibiza frankfurt', impressions: 30, clicks: 1, position: 6 },
  ];
  const [row] = normalizeGscRows(raw);
  assert.equal(row.slug, 'ibiza-frankfurt');
  assert.equal(row.impressions, 100); // summed
  assert.equal(row.clicks, 2); // summed
  assert.equal(row.primaryQuery, 'flugzeit ibiza frankfurt'); // highest-impression query
  // impression-weighted position: (9*40 + 12*30 + 6*30)/100 = 9.0
  assert.equal(row.position, 9);
});

test('normalizeGscRows tolerates junk rows without throwing', () => {
  assert.deepEqual(normalizeGscRows(null), []);
  assert.deepEqual(normalizeGscRows('nope'), []);
  const rows = normalizeGscRows([null, {}, { foo: 'bar' }, { page: '/city/x', impressions: 5, position: 3 }]);
  assert.equal(rows.length, 0); // none are flights URLs / usable
});

test('clicks stay null (unknown) when no row carried a click value', () => {
  const [row] = normalizeGscRows([{ page: '/flights/fra-hel', impressions: 9, position: 9.67 }]);
  assert.equal(row.clicks, null);
});

// ─── §3/§4 Report builder ──────────────────────────────────────────────────
test('report exposes every required §3 field', () => {
  const [row] = buildOpportunityReport([{ page: '/flights/ibiza-frankfurt', impressions: 70, position: 9.31 }]);
  for (const f of ['url', 'language', 'primaryQuery', 'impressions', 'clicks', 'ctr', 'position', 'category', 'status', 'lastOptimizedAt']) {
    assert.ok(f in row, `missing field ${f}`);
  }
  assert.equal(row.status, 'ANALYZED'); // default when no operator overlay
  assert.equal(row.ctr, null); // no clicks in the export
});

test('report applies the operator status/last-optimized overlay', () => {
  const overlay = { 'ibiza-frankfurt': { status: 'MONITORING', lastOptimizedAt: '2026-08-07' } };
  const [row] = buildOpportunityReport([{ page: '/flights/ibiza-frankfurt', impressions: 70, position: 9.31 }], overlay);
  assert.equal(row.status, 'MONITORING');
  assert.equal(row.lastOptimizedAt, '2026-08-07');
});

test('report sort: category order then impressions desc then best position', () => {
  const report = buildOpportunityReport(GSC_SAMPLE_ROWS);
  const order = report.map((r) => r.category);
  // BREAKOUT first, then all VERY_HIGH, then HIGH, then NORMAL, then LOW.
  const idx = (c) => order.indexOf(c);
  assert.equal(order[0], 'BREAKOUT'); // madrid-ibiza (pos 4.62)
  assert.ok(idx('VERY_HIGH') < idx('HIGH'));
  assert.ok(idx('HIGH') < idx('NORMAL'));
  assert.ok(!order.includes('LOW')); // none in this sample
  // Within VERY_HIGH, impressions desc: 109, 87, 70, 49.
  const vh = report.filter((r) => r.category === 'VERY_HIGH').map((r) => r.impressions);
  assert.deepEqual(vh, [109, 87, 70, 49]);
});

test('the GSC sample classifies to the expected categories (regression guard)', () => {
  const report = buildOpportunityReport(GSC_SAMPLE_ROWS);
  assert.equal(report.length, 15);
  for (const r of report) {
    assert.equal(r.category, EXPECTED_CATEGORY[r.slug], `${r.slug} category`);
    assert.equal(r.clicks, null, `${r.slug} clicks must stay unknown`);
    assert.equal(r.ctr, null, `${r.slug} CTR must be n/a`);
  }
});
