// Tests the smart recommendations engine: each rule fires on the right pipeline
// state, stays quiet otherwise, and results are ordered by severity. All inputs
// are plain data with an injectable `now` so time-based rules are deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRecommendations, STALE_DRAFT_DAYS } = require('../lib/social/recommendations.js');

const NOW = Date.parse('2026-08-07T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 24 * 3600 * 1000).toISOString();
const daysAhead = (n) => new Date(NOW + n * 24 * 3600 * 1000).toISOString();

function types(recs) {
  return recs.map((r) => r.type);
}

test('empty pipeline fires when nothing is approved or scheduled', () => {
  const recs = buildRecommendations({ queue: [], now: NOW });
  assert.ok(types(recs).includes('empty_pipeline'));
});

test('empty pipeline does NOT fire once something is scheduled', () => {
  const recs = buildRecommendations({
    queue: [{ status: 'scheduled', scheduled_at: daysAhead(1), platform: 'instagram', language: 'de' }],
    now: NOW,
  });
  assert.ok(!types(recs).includes('empty_pipeline'));
});

test('approved-but-unscheduled fires and carries a count + filter action', () => {
  const recs = buildRecommendations({
    queue: [
      { status: 'approved', scheduled_at: null, platform: 'x', language: 'en' },
      { status: 'approved', scheduled_at: daysAhead(2), platform: 'x', language: 'en' }, // scheduled → excluded
    ],
    now: NOW,
  });
  const rec = recs.find((r) => r.type === 'unscheduled_approved');
  assert.ok(rec);
  assert.equal(rec.meta.count, 1);
  assert.deepEqual(rec.action, { kind: 'filter_status', status: 'approved' });
});

test('uncovered opportunities lists only 4★+ routes with no post', () => {
  const recs = buildRecommendations({
    opportunities: [
      { slug: 'a-b', stars: 5, label: 'A → B' },
      { slug: 'c-d', stars: 4, label: 'C → D' },
      { slug: 'e-f', stars: 3, label: 'E → F' }, // below threshold
      { slug: 'g-h', stars: 5, label: 'G → H' }, // already covered
    ],
    queue: [{ status: 'draft', subject_ref: 'g-h', created_at: daysAgo(0), platform: 'instagram', language: 'de' }],
    now: NOW,
  });
  const rec = recs.find((r) => r.type === 'uncovered_opportunities');
  assert.ok(rec);
  assert.deepEqual(rec.meta.slugs.sort(), ['a-b', 'c-d']);
});

test('platform and language gaps fire only for targeted-but-unproduced values', () => {
  const recs = buildRecommendations({
    config: { platforms: ['instagram', 'facebook'], languages: ['de', 'ar'] },
    queue: [{ status: 'draft', platform: 'instagram', language: 'de', created_at: daysAgo(0) }],
    now: NOW,
  });
  const pg = recs.find((r) => r.type === 'platform_gaps');
  const lg = recs.find((r) => r.type === 'language_gaps');
  assert.deepEqual(pg.meta.platforms, ['facebook']);
  assert.deepEqual(lg.meta.languages, ['ar']);
});

test('no platform/language gap recs without configured targets', () => {
  const recs = buildRecommendations({
    queue: [{ status: 'draft', platform: 'instagram', language: 'de', created_at: daysAgo(0) }],
    now: NOW,
  });
  assert.ok(!types(recs).includes('platform_gaps'));
  assert.ok(!types(recs).includes('language_gaps'));
});

test('schedule gap fires when ready content has nothing scheduled in the next 7 days', () => {
  const recs = buildRecommendations({
    queue: [
      { status: 'approved', scheduled_at: null, platform: 'x', language: 'en' },
      { status: 'scheduled', scheduled_at: daysAhead(20), platform: 'x', language: 'en' }, // beyond window
    ],
    now: NOW,
  });
  assert.ok(types(recs).includes('schedule_gap'));
});

test('schedule gap stays quiet when a post is scheduled inside the window', () => {
  const recs = buildRecommendations({
    queue: [{ status: 'scheduled', scheduled_at: daysAhead(2), platform: 'x', language: 'en' }],
    now: NOW,
  });
  assert.ok(!types(recs).includes('schedule_gap'));
});

test('stale drafts fire past the threshold, not before', () => {
  const fresh = buildRecommendations({
    queue: [{ status: 'draft', created_at: daysAgo(STALE_DRAFT_DAYS - 1), platform: 'x', language: 'en' }],
    now: NOW,
  });
  assert.ok(!types(fresh).includes('stale_drafts'));

  const stale = buildRecommendations({
    queue: [{ status: 'draft', created_at: daysAgo(STALE_DRAFT_DAYS + 1), platform: 'x', language: 'en' }],
    now: NOW,
  });
  assert.ok(types(stale).includes('stale_drafts'));
});

test('recommendations are ordered by severity (high → medium → low)', () => {
  const recs = buildRecommendations({
    opportunities: [{ slug: 'a-b', stars: 5, label: 'A → B' }],
    config: { platforms: ['facebook'], languages: ['fr'] },
    queue: [
      { status: 'approved', scheduled_at: null, platform: 'x', language: 'en' }, // high
      { status: 'draft', created_at: daysAgo(30), platform: 'x', language: 'en' }, // low (stale)
    ],
    now: NOW,
  });
  const ranks = { high: 3, medium: 2, low: 1 };
  const seq = recs.map((r) => ranks[r.severity]);
  const sorted = [...seq].sort((a, b) => b - a);
  assert.deepEqual(seq, sorted);
  assert.equal(recs[0].severity, 'high');
});

test('bad/missing timestamps never throw and simply do not match time rules', () => {
  const recs = buildRecommendations({
    queue: [
      { status: 'draft', created_at: 'not-a-date', platform: 'x', language: 'en' },
      { status: 'scheduled', scheduled_at: null, platform: 'x', language: 'en' },
    ],
    now: NOW,
  });
  assert.ok(Array.isArray(recs));
  assert.ok(!types(recs).includes('stale_drafts'));
});
