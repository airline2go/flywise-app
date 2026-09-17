import assert from 'node:assert/strict';
import { test } from 'node:test';

test('localized route sitemap uses the fixed production backend origin and cache namespace', async () => {
  const previousFetch = globalThis.fetch;
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
    const parsed = new URL(calls[0].url);
    assert.equal(parsed.origin, 'https://flywise-server-eu.onrender.com');
    assert.equal(parsed.pathname, '/sitemap-data/routes-localized');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(parsed.searchParams.get('page'), '0');
    assert.equal(parsed.searchParams.get('v'), '2');
    assert.equal(parsed.searchParams.get('slugs'), null);
    assert.deepEqual(calls[0].options.next, { revalidate: 900 });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('localized route sitemap sends bounded core slugs to the backend', async () => {
  const previousFetch = globalThis.fetch;
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
    const { listLocalizedRouteSitemap } = await import(`../lib/localized-route-sitemap.js?bounded=${Date.now()}`);
    const items = await listLocalizedRouteSitemap('en', ['Alicante-Barcelona', 'berlin-copenhagen']);

    assert.deepEqual(items, [{ id: 'alicante-barcelona', language: 'en', lastmod: '2026-09-17' }]);
    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url);
    assert.equal(parsed.origin, 'https://flywise-server-eu.onrender.com');
    assert.equal(parsed.pathname, '/sitemap-data/routes-localized');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(parsed.searchParams.get('page'), '0');
    assert.equal(parsed.searchParams.get('v'), '2');
    assert.equal(parsed.searchParams.get('slugs'), 'alicante-barcelona,berlin-copenhagen');
    assert.deepEqual(calls[0].options.next, { revalidate: 900 });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
