import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    return {
      route: {
        slug: 'alicante-barcelona',
        origin_iata: 'ALC',
        destination_iata: 'BCN',
        seo_lang: 'de',
        seo_title: 'Old title',
        seo_meta_description: 'Old meta',
        seo_intro_html: '<p>30–49 EUR stale copy</p>',
        seo_faq: [{ question: 'Price', answer: '30–49 EUR' }],
        seo_generated_at: '2026-09-17T12:46:58.163Z',
        insights_updated_at: '2026-09-17T16:58:20.613Z',
        price_updated_at: '2026-09-17T17:21:09.278Z',
      },
    };
  },
});

try {
  const { getRoutePage } = await import('../lib/content-api.js');
  const route = await getRoutePage('alicante-barcelona', 'de');

  assert.ok(route);
  assert.equal(route.seo_intro_html, null);
  assert.equal(route.seo_faq, null);
  assert.equal(route.seo_generated_at, '2026-09-17T12:46:58.163Z');
  assert.equal(route.insights_updated_at, '2026-09-17T16:58:20.613Z');
  assert.equal(route.price_updated_at, '2026-09-17T17:21:09.278Z');
} finally {
  globalThis.fetch = originalFetch;
}
