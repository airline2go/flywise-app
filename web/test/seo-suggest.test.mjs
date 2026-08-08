// Tests for the rule-based optimization SUGGESTIONS (the AI fallback). These
// guarantee the fallback never fabricates and only proposes on a real trigger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildOptimizationSuggestions, parseCities } = require('../lib/seo/suggest.js');

test('parseCities reads the real city pair from a German H1', () => {
  const c = parseCities({ h1: 'Flüge von Hamburg nach Barcelona' }, 'de');
  assert.deepEqual(c, { origin: 'Hamburg', destination: 'Barcelona' });
});

test('parseCities returns null when it cannot extract a clean pair', () => {
  assert.equal(parseCities({ h1: 'Willkommen bei Airpiv' }, 'de'), null);
  assert.equal(parseCities({}, 'de'), null);
});

test('no change recommended when the page is already strong and no opportunity', () => {
  const out = buildOptimizationSuggestions({
    elements: {
      title: 'Hamburg → Barcelona: Flugzeit | Airpiv',
      metaDescription: 'Wie lange dauert der Flug von Hamburg nach Barcelona? Erfahre die Flugzeit auf Airpiv.',
      h1: 'Flüge von Hamburg nach Barcelona',
      content: { hasFlightTime: true, hasDirectInfo: true },
    },
    gsc: { impressions: 5, clicks: 1, position: 30 }, // no CTR opportunity
    dominantIntent: 'duration',
    lang: 'de',
  });
  assert.equal(out.title.changeRecommended, false);
  assert.equal(out.title.proposed, null);
  assert.equal(out.h1.changeRecommended, false);
});

test('proposes a title/meta on a real CTR opportunity with intent mismatch, using only real facets', () => {
  const out = buildOptimizationSuggestions({
    elements: {
      title: 'Hamburg Barcelona | Airpiv', // does not lead with the intent
      metaDescription: 'Infos zu Hamburg und Barcelona.', // not a question
      h1: 'Flüge von Hamburg nach Barcelona',
      content: { hasFlightTime: true, hasDirectInfo: true, hasPrice: false, hasDistance: false },
    },
    gsc: { impressions: 120, clicks: 1, position: 8 }, // ~0.8% CTR at pos 8 → opportunity
    dominantIntent: 'duration',
    lang: 'de',
  });
  assert.equal(out.opportunity, true);
  assert.equal(out.title.changeRecommended, true);
  assert.match(out.title.proposed, /Flugzeit/); // leads with the dominant intent
  assert.match(out.title.proposed, /\| Airpiv$/); // brand preserved
  assert.doesNotMatch(out.title.proposed, /Preise|Entfernung/); // no facet the page can't back
  assert.equal(out.meta.changeRecommended, true);
  assert.match(out.meta.proposed, /\?/); // question-style meta
});

test('missing title/meta/h1 always trigger a proposal', () => {
  const out = buildOptimizationSuggestions({
    elements: { title: null, metaDescription: null, h1: 'Flüge von Berlin nach Rom', content: {} },
    gsc: null,
    dominantIntent: 'flight',
    lang: 'de',
  });
  assert.equal(out.title.changeRecommended, true);
  assert.equal(out.meta.changeRecommended, true);
  assert.equal(out.h1.changeRecommended, false); // H1 present & clear → untouched
});

test('content generation is grounded in extracted facts and never invents numbers', () => {
  const withFacts = buildOptimizationSuggestions({
    elements: {
      title: 'Hamburg → Barcelona | Airpiv',
      h1: 'Flüge von Hamburg nach Barcelona',
      content: { hasFlightTime: true, hasDirectInfo: true },
      facts: { distanceKm: '1.100 km', flightTime: '2h 20min', airlines: ['Vueling'] },
    },
    gsc: null,
    dominantIntent: 'duration',
    lang: 'de',
  });
  assert.equal(withFacts.content.changeRecommended, true);
  assert.match(withFacts.content.proposed, /Hamburg/);
  assert.match(withFacts.content.proposed, /Barcelona/);
  assert.match(withFacts.content.proposed, /2h 20min/); // real flight time surfaced
  assert.match(withFacts.content.proposed, /1\.100 km/); // real distance surfaced
  assert.ok(withFacts.content.factsUsed.some((f) => /2h 20min/.test(f)));

  // No facts on the page → the content must NOT assert any number/distance.
  const noFacts = buildOptimizationSuggestions({
    elements: { title: 'x', h1: 'Flüge von Berlin nach Rom', content: {}, facts: {} },
    gsc: null,
    dominantIntent: 'duration',
    lang: 'de',
  });
  assert.equal(noFacts.content.changeRecommended, true);
  assert.doesNotMatch(noFacts.content.proposed, /\d+\s*km/i); // no fabricated distance
  assert.doesNotMatch(noFacts.content.proposed, /\d+\s*(?:h|std|min)\b/i); // no fabricated duration
  assert.deepEqual(noFacts.content.factsUsed, []);
});

test('content is null (manual review) when cities cannot be parsed', () => {
  const out = buildOptimizationSuggestions({
    elements: { title: 'Willkommen', h1: 'Startseite', content: {}, facts: {} },
    gsc: null,
    dominantIntent: 'flight',
    lang: 'de',
  });
  assert.equal(out.content.proposed, null);
  assert.equal(out.content.changeRecommended, false);
});

test('unsupported language yields a manual-review note, never a guessed translation', () => {
  const out = buildOptimizationSuggestions({
    elements: { title: 'Titre', h1: 'Vols de Paris à Nice', content: {} },
    gsc: { impressions: 100, clicks: 0, position: 6 },
    dominantIntent: 'duration',
    lang: 'fr',
  });
  assert.equal(out.title.changeRecommended, false);
  assert.equal(out.title.proposed, null);
  assert.match(out.title.reason, /غير مدعومة|يدوياً/);
});
