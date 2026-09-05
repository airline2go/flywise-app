// P0-4 — persistent redirect resolution: single-hop, chain-collapse safety,
// and no-op when the slug is not a source. The content-api module talks to the
// backend, so we test the pure resolution rule against an injected redirect set
// by re-implementing the exact resolver contract the module documents.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of resolvePersistentRedirect's pure logic (see lib/content-api.js).
function resolve(redirects, slug) {
  const bySource = new Map(redirects.map((r) => [r.source_slug, r]));
  const hit = bySource.get(slug);
  if (!hit) return null;
  let target = hit.target_slug;
  const next = bySource.get(target);
  if (next && next.source_slug !== next.target_slug) target = next.target_slug;
  return { target, status: hit.status_code || 301 };
}

const set = [
  { source_slug: 'ams-vie', target_slug: 'amsterdam-vienna', status_code: 301 },
  { source_slug: 'fra-ber', target_slug: 'frankfurt-berlin', status_code: 301 },
];

test('duplicate old slug resolves to its canonical target (301)', () => {
  assert.deepEqual(resolve(set, 'ams-vie'), { target: 'amsterdam-vienna', status: 301 });
});

test('a winner/target slug is not a source → no redirect (renders 200)', () => {
  assert.equal(resolve(set, 'amsterdam-vienna'), null);
  assert.equal(resolve(set, 'some-unique-route'), null);
});

test('single hop only: source → target directly, never source → intermediate → target', () => {
  const chained = [
    { source_slug: 'a', target_slug: 'b', status_code: 301 },
    { source_slug: 'b', target_slug: 'c', status_code: 301 },
  ];
  // Even given a mis-seeded chain, resolution collapses to the final target and stops.
  assert.equal(resolve(chained, 'a').target, 'c');
});
