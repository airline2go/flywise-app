// Unit tests for the /api/revalidate path-mapping + IndexNow payload logic
// (lib/revalidate-paths.mjs). Run with `npm test` (node --test).
//
// These cover instruction-3's requirement that ALL six entity types map to the
// correct revalidation paths, plus the IndexNow payload shape. The route
// handler itself (auth, revalidatePath(), the network call) is a thin wrapper
// over these pure functions — see app/api/revalidate/route.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_PATH, computeRevalidatePaths, buildIndexNowPayload } from '../lib/revalidate-paths.mjs';

// Mirror of lib/languages.js (7 languages; German is the default, served
// unprefixed at the root). Kept as a local fixture because languages.js is
// ESM-via-Next and not loadable by plain `node --test`.
const LANGUAGES = ['en', 'de', 'ar', 'es', 'fr', 'it', 'nl'].map((code) => ({ code }));
const DEFAULT_LANGUAGE = 'de';
const pathFor = (code, rel) => `/${code === DEFAULT_LANGUAGE ? '' : code + '/'}${rel}`;

const run = (entities) => computeRevalidatePaths(entities, LANGUAGES, pathFor);

test('route entity → all 7 language variants, German unprefixed', () => {
  const paths = run([{ type: 'route', slug: 'muc-pmi' }]);
  assert.equal(paths.length, 7);
  assert.ok(paths.includes('/flights/muc-pmi'), 'German at root');
  assert.ok(paths.includes('/en/flights/muc-pmi'));
  assert.ok(paths.includes('/ar/flights/muc-pmi'));
  assert.ok(!paths.includes('/de/flights/muc-pmi'), 'German is never prefixed');
});

test('city / country / airport / airline each map to the right base path', () => {
  const cases = [
    ['city', 'munich', 'city'],
    ['country', 'ES', 'country'],
    ['airport', 'MUC', 'airport'],
    ['airline', 'LH', 'airline'],
  ];
  for (const [type, slug, base] of cases) {
    const paths = run([{ type, slug }]);
    assert.equal(paths.length, 7, `${type} → 7 langs`);
    assert.ok(paths.includes(`/${base}/${slug}`), `${type} German root`);
    assert.ok(paths.includes(`/en/${base}/${slug}`), `${type} English prefixed`);
  }
});

test('blog is per-language: de → 1 root path, en → 1 prefixed path', () => {
  assert.deepEqual(run([{ type: 'blog', slug: 'mein-post', lang: 'de' }]), ['/blog/mein-post']);
  assert.deepEqual(run([{ type: 'blog', slug: 'my-post', lang: 'en' }]), ['/en/blog/my-post']);
});

test('blog with missing/unknown lang defaults to German', () => {
  assert.deepEqual(run([{ type: 'blog', slug: 'x' }]), ['/blog/x']);
  assert.deepEqual(run([{ type: 'blog', slug: 'x', lang: 'fr' }]), ['/blog/x']);
});

test('a mixed multi-entity payload (route publish) covers route + city + country', () => {
  // Mirrors flywise-server routeEntities(): a route publish also revalidates
  // its origin/destination city + country pages.
  const paths = run([
    { type: 'route', slug: 'muc-pmi' },
    { type: 'country', slug: 'DE' },
    { type: 'country', slug: 'ES' },
    { type: 'city', slug: 'munich' },
    { type: 'city', slug: 'palma' },
  ]);
  assert.equal(paths.length, 5 * 7);
  assert.ok(paths.includes('/flights/muc-pmi'));
  assert.ok(paths.includes('/country/ES'));
  assert.ok(paths.includes('/ar/city/palma'));
});

test('duplicate entities are de-duplicated', () => {
  const paths = run([
    { type: 'city', slug: 'munich' },
    { type: 'city', slug: 'munich' },
  ]);
  assert.equal(paths.length, 7);
});

test('invalid / unknown entries are skipped, never throw', () => {
  assert.deepEqual(run(null), []);
  assert.deepEqual(run(undefined), []);
  assert.deepEqual(run([]), []);
  assert.deepEqual(run([{ type: 'route' }]), [], 'missing slug');
  assert.deepEqual(run([{ type: 'route', slug: '' }]), [], 'empty slug');
  assert.deepEqual(run([{ type: 'nope', slug: 'x' }]), [], 'unknown type');
  assert.deepEqual(run([{ slug: 'x' }]), [], 'missing type');
  assert.deepEqual(run([null, 42, 'x']), [], 'junk entries');
});

test('BASE_PATH covers exactly the six supported entity types', () => {
  assert.deepEqual(
    Object.keys(BASE_PATH).sort(),
    ['airline', 'airport', 'blog', 'city', 'country', 'route'],
  );
});

test('buildIndexNowPayload has the correct host, key, keyLocation and absolute URLs', () => {
  const payload = buildIndexNowPayload(['/flights/muc-pmi', '/en/flights/muc-pmi'], {
    origin: 'https://airpiv.com',
    key: 'a47b14935285b55b6ce1f3786e81262f',
  });
  assert.equal(payload.host, 'airpiv.com');
  assert.equal(payload.key, 'a47b14935285b55b6ce1f3786e81262f');
  assert.equal(payload.keyLocation, 'https://airpiv.com/a47b14935285b55b6ce1f3786e81262f.txt');
  assert.deepEqual(payload.urlList, [
    'https://airpiv.com/flights/muc-pmi',
    'https://airpiv.com/en/flights/muc-pmi',
  ]);
});
