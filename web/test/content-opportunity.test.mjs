// Tests the Content Opportunity scoring model (the card + Recommended-Today
// engine). Route signals (price drop, popularity, airline count, direct) come
// from route data now; Search Console signals push a strong route to 5 stars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { scoreOpportunity, rankOpportunities, starsFor } = require('../lib/social/opportunity.js');

test('a fully-signalled Malaga → Ibiza opportunity scores 5 stars', () => {
  const o = scoreOpportunity(
    { priceDrop: 'yes', popularity: 88, airlineCount: 5, direct: 'all', searchVolume: 82, position: 18, ctr: 'low', competition: 'medium', seasonality: 'high' },
    { type: 'route', slug: 'malaga-ibiza' },
  );
  assert.equal(o.stars, 5);
  assert.ok(o.score >= 82, `score ${o.score}`);
  assert.equal(o.suggestedTemplate, 'flight_deal');
  assert.equal(o.dataComplete, true);
  assert.match(o.reasons[0], /price drop|popular|page 2/i);
});

test('route data alone (no Search Console) can reach 4 stars for a strong route', () => {
  const o = scoreOpportunity({ priceDrop: 25, popularity: 90, airlineCount: 5, direct: 'all' }, { type: 'route', slug: 'x' });
  assert.ok(o.stars >= 4, `stars ${o.stars} score ${o.score}`);
  // GSC-only signals are reported missing — nothing invented.
  assert.deepEqual(o.missing.sort(), ['competition', 'ctr', 'demand', 'position', 'seasonality'].sort());
});

test('price drop scales with magnitude (a 25% drop beats a 6% drop)', () => {
  const big = scoreOpportunity({ priceDrop: 25 }).score;
  const small = scoreOpportunity({ priceDrop: 6 }).score;
  assert.ok(big > small, `${big} vs ${small}`);
});

test('popularity (route_score) contributes proportionally', () => {
  assert.ok(scoreOpportunity({ popularity: 90 }).score > scoreOpportunity({ popularity: 30 }).score);
});

test('more airlines and direct flights raise the score', () => {
  assert.ok(scoreOpportunity({ airlineCount: 5 }).score > scoreOpportunity({ airlineCount: 1 }).score);
  assert.ok(scoreOpportunity({ direct: 'all' }).score > scoreOpportunity({ direct: 'some' }).score);
  assert.ok(scoreOpportunity({ direct: 'some' }).score > scoreOpportunity({ direct: null }).score);
});

test('page-2 ranking (11–20) is the sweet spot and scores higher than page 1', () => {
  assert.ok(scoreOpportunity({ position: 15 }).score > scoreOpportunity({ position: 2 }).score);
});

test('missing signals are reported and never fabricate a score', () => {
  const o = scoreOpportunity({ priceDrop: true });
  assert.equal(o.dataComplete, false);
  assert.ok(o.missing.includes('demand') && o.missing.includes('position'));
  assert.equal(o.score, Math.round(25 * 0.75)); // only the price-drop contribution
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
    { inputs: { popularity: 10 }, subject: { type: 'route', slug: 'weak' } },
    { inputs: { priceDrop: 25, popularity: 90, airlineCount: 5, direct: 'all' }, subject: { type: 'route', slug: 'strong' } },
  ]);
  assert.equal(ranked[0].subject.slug, 'strong');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('city subject with no price drop suggests a city guide', () => {
  assert.equal(scoreOpportunity({ popularity: 60 }, { type: 'city', slug: 'ibiza' }).suggestedTemplate, 'city_guide');
});
