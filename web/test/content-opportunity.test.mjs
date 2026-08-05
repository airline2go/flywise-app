// Tests the Content Opportunity scoring model (the card's brain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { scoreOpportunity, rankOpportunities, starsFor } = require('../lib/social/opportunity.js');

test('the Malaga → Ibiza example scores as a top (5-star) opportunity', () => {
  const o = scoreOpportunity(
    { searchVolume: 82, competition: 'medium', position: 18, ctr: 'low', priceDrop: 'yes', seasonality: 'high' },
    { type: 'route', slug: 'malaga-ibiza' },
  );
  assert.equal(o.stars, 5);
  assert.ok(o.score >= 82, `score ${o.score}`);
  assert.equal(o.suggestedTemplate, 'flight_deal'); // price drop → deal post
  assert.equal(o.dataComplete, true);
  assert.ok(o.reasons.length >= 3);
  // top reason should reflect the strongest signal (price drop or page-2)
  assert.match(o.reasons[0], /price drop|page 2/i);
});

test('page-2 ranking (11–20) is the sweet spot and scores higher than page 1', () => {
  const page2 = scoreOpportunity({ position: 15 }).score;
  const page1 = scoreOpportunity({ position: 2 }).score;
  assert.ok(page2 > page1, `page2 ${page2} should beat page1 ${page1}`);
});

test('missing signals are reported and do not fabricate a score', () => {
  const o = scoreOpportunity({ priceDrop: true, seasonality: 'high' }); // no GSC data
  assert.equal(o.dataComplete, false);
  assert.deepEqual(o.missing.sort(), ['competition', 'ctr', 'demand', 'position'].sort());
  assert.equal(o.score, 20); // 10 (price drop) + 10 (seasonality), nothing invented
});

test('low CTR contributes more opportunity than high CTR', () => {
  const low = scoreOpportunity({ ctr: 'low' }).score;
  const high = scoreOpportunity({ ctr: 'high' }).score;
  assert.ok(low > high);
});

test('starsFor thresholds are monotonic', () => {
  assert.equal(starsFor(90), 5);
  assert.equal(starsFor(70), 4);
  assert.equal(starsFor(50), 3);
  assert.equal(starsFor(30), 2);
  assert.equal(starsFor(10), 1);
});

test('rankOpportunities orders by score, highest first', () => {
  const ranked = rankOpportunities([
    { inputs: { position: 45 }, subject: { type: 'route', slug: 'weak' } },
    { inputs: { searchVolume: 82, position: 18, ctr: 'low', priceDrop: 'yes', seasonality: 'high', competition: 'medium' }, subject: { type: 'route', slug: 'strong' } },
  ]);
  assert.equal(ranked[0].subject.slug, 'strong');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('city subject with no price drop suggests a city guide', () => {
  const o = scoreOpportunity({ searchVolume: 500, position: 12 }, { type: 'city', slug: 'ibiza' });
  assert.equal(o.suggestedTemplate, 'city_guide');
});
