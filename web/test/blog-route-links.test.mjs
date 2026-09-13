// [#16/#18] Blog → Route internal links must be CONTEXTUAL, never repetitive
// filler. buildPopularRoutesHtml links a route only when the article actually
// mentions one of its endpoint cities; an article that mentions no known city
// renders NO routes block (the old "first 4 routes" generic fallback is gone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { buildPopularRoutesHtml } = require('../lib/legacy-render/render-blog-post.js');

setGeoData(
  [
    { city_slug: 'frankfurt', airport_codes: ['FRA'], translations: { de: 'Frankfurt', en: 'Frankfurt' } },
    { city_slug: 'ibiza', airport_codes: ['IBZ'], translations: { de: 'Ibiza', en: 'Ibiza' } },
    { city_slug: 'palma-de-mallorca', airport_codes: ['PMI'], translations: { de: 'Palma de Mallorca', en: 'Palma de Mallorca' } },
  ],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }, { code: 'ES', translations: { de: 'Spanien', en: 'Spain' } }],
);

const routes = [
  { slug: 'ibiza-frankfurt', origin_iata: 'IBZ', destination_iata: 'FRA', origin_city: 'Ibiza', destination_city: 'Frankfurt' },
  { slug: 'frankfurt-palma-de-mallorca', origin_iata: 'FRA', destination_iata: 'PMI', origin_city: 'Frankfurt', destination_city: 'Palma de Mallorca' },
];

test('links a route the article actually mentions (contextual match)', () => {
  const post = { title: 'Flugzeit IBZ nach FRA', content: '<p>Der Flug von IBZ nach FRA dauert…</p>' };
  const html = buildPopularRoutesHtml(post, routes, 'de');
  assert.ok(html.includes('Passende Flugverbindungen'), 'uses the contextual "matching" heading');
  assert.ok(html.includes('/flights/ibiza-frankfurt'), 'links the mentioned route');
});

test('renders NO routes block when the article mentions no known city (no generic filler)', () => {
  const post = { title: 'Packing tips for winter', content: '<p>Bring a warm coat and comfortable shoes.</p>' };
  const html = buildPopularRoutesHtml(post, routes, 'en');
  assert.equal(html, '', 'no contextual match → no block (no first-4 fallback)');
});

test('never emits the old generic "Popular flight routes" fallback heading', () => {
  const post = { title: 'Nothing routable here', content: '<p>Generic travel musings.</p>' };
  const de = buildPopularRoutesHtml(post, routes, 'de');
  const en = buildPopularRoutesHtml(post, routes, 'en');
  assert.ok(!de.includes('Beliebte Flugverbindungen') && !en.includes('Popular flight routes'), 'generic fallback removed');
});

test('a route sharing one mentioned city still qualifies (score ≥ 1)', () => {
  // Article mentions only Frankfurt → both FRA routes share an endpoint.
  const post = { title: 'Frankfurt city guide', content: '<p>Frankfurt is a major hub.</p>' };
  const html = buildPopularRoutesHtml(post, routes, 'en');
  assert.ok(html.includes('/flights/ibiza-frankfurt') || html.includes('/flights/frankfurt-palma-de-mallorca'), 'a Frankfurt route is linked');
});
