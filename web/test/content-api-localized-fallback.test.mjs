import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

try {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/localized?lang=fr')) {
      return {
        ok: false,
        status: 429,
        async json() { return {}; },
      };
    }
    if (String(url).includes('/route-pages/prg-doh')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            route: {
              slug: 'prg-doh',
              origin_iata: 'PRG',
              destination_iata: 'DOH',
              origin_city: 'Prague',
              destination_city: 'Doha',
              seo_title: 'German source title',
              seo_meta_description: 'German source meta',
              seo_intro_html: '<p>Canonical facts</p>',
              seo_faq: [{ question: 'Q', answer: 'A' }],
            },
          };
        },
      };
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const { getRoutePage } = await import('../lib/content-api.js');
  const route = await getRoutePage('prg-doh', 'fr');

  assert.ok(route);
  assert.equal(route.slug, 'prg-doh');
  assert.equal(route.seo_lang, 'fr');
  assert.equal(route.seo_title, null);
  assert.equal(route.seo_meta_description, null);
  assert.equal(route.seo_intro_html, null);
  assert.equal(route.seo_faq, null);
  assert.equal(calls.filter((url) => url.includes('/localized?lang=fr')).length, 3);
  assert.equal(calls.filter((url) => url.endsWith('/route-pages/prg-doh')).length, 1);
} finally {
  globalThis.fetch = originalFetch;
}
