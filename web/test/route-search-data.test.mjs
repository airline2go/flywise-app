import assert from 'node:assert/strict';
import test from 'node:test';

const originalFetch = globalThis.fetch;

test('fetches route search data with an isolated cache key and returns the route payload', async () => {
  let requestedUrl = null;
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    assert.deepEqual(options, { next: { revalidate: 900 } });
    return new Response(JSON.stringify({ route: { slug: 'hamburg-duesseldorf' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const { getRouteSearchData } = await import(`../lib/route-search-data.js?test=${Date.now()}`);
  const route = await getRouteSearchData('hamburg-duesseldorf');

  assert.equal(route.slug, 'hamburg-duesseldorf');
  assert.match(requestedUrl, /\/route-pages\/hamburg-duesseldorf\?surface=route-search$/);
});

test('fails closed to null when the route endpoint is unavailable', async () => {
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  const { getRouteSearchData } = await import(`../lib/route-search-data.js?test=404-${Date.now()}`);
  assert.equal(await getRouteSearchData('missing-route'), null);
});

test.after(() => {
  globalThis.fetch = originalFetch;
});
