// [TTL-POLICY / F-3] Next.js requires `export const revalidate = <literal>`
// to be statically analyzable, so these tests compare real route literals
// with the central policy constants and prevent silent drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ttl = require('../lib/legacy-render/ttl.js');
const web = join(dirname(fileURLToPath(import.meta.url)), '..');

function revalidateOf(relPath) {
  const src = readFileSync(join(web, relPath), 'utf8');
  const m = src.match(/export const revalidate\s*=\s*(\d+)/);
  assert.ok(m, `no numeric revalidate literal in ${relPath}`);
  return Number(m[1]);
}

test('flight-route handlers use ROUTE_PAGE_REVALIDATE_S; entity handlers use ENTITY_PAGE_REVALIDATE_S', () => {
  for (const p of ['app/[lang]/flights/[slug]/route.js', 'app/(de)/flights/[slug]/route.js']) {
    assert.equal(revalidateOf(p), ttl.ROUTE_PAGE_REVALIDATE_S, `${p} revalidate must equal ROUTE_PAGE_REVALIDATE_S`);
  }
  for (const p of ['app/(de)/city/[slug]/route.js', 'app/(de)/country/[code]/route.js', 'app/(de)/airport/[code]/route.js', 'app/(de)/airline/[code]/route.js']) {
    assert.equal(revalidateOf(p), ttl.ENTITY_PAGE_REVALIDATE_S, `${p} revalidate must equal ENTITY_PAGE_REVALIDATE_S`);
  }
});

test('sitemap index, route-type child and shard use their documented windows', () => {
  assert.equal(revalidateOf('app/sitemap.xml/route.js'), ttl.SITEMAP_REVALIDATE_S);
  assert.equal(revalidateOf('app/sitemap-routes.xml/route.js'), ttl.SITEMAP_ROUTE_REVALIDATE_S);
  assert.equal(revalidateOf('app/sitemap-shard/[file]/route.js'), ttl.SITEMAP_SHARD_REVALIDATE_S);
});
