import assert from 'node:assert/strict';
import { test } from 'node:test';

test('localized route sitemap uses the dedicated backend origin by default', async () => {
  const previousBase = process.env.SITEMAP_API_BASE;
  const previousFetch = globalThis.fetch;
  delete process.env.SITEMAP_API_BASE;

  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({
      ok: true,
      page: 0,
      hasMore: false,
      language: 'en',
      items: [{ id: 'alicante-barcelona', language: 'en', lastmod: '2026-09-17' }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const { listLocalizedRouteSitemap } = await import(`../lib/localized-route-sitemap.js?case=${Date.now()}`);
    const items = await listLocalizedRouteSitemap('en');

    assert.deepEqual(items, [{ id: 'alicante-barcelona', language: 'en', lastmod: '2026-09-17' }]);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      'https://flywise-server-eu.onrender.com/sitemap-data/routes-localized?lang=en&page=0',
    );
    assert.deepEqual(calls[0].options.next, { revalidate: 900 });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase == null) delete process.env.SITEMAP_API_BASE;
    else process.env.SITEMAP_API_BASE = previousBase;
  }
});
