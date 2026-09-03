// [TTL-POLICY / F-3] Next.js requires `export const revalidate = <literal>` to
// be a statically-analyzable literal, so the route files can't import the value
// from ttl.js. This test keeps the "one policy" real anyway: it parses the
// actual literals out of representative route files and asserts they match the
// documented constants in ttl.js, so changing a route's window without updating
// the policy (or vice versa) fails CI.
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

test('entity page routes use the documented ROUTE_PAGE_REVALIDATE_S', () => {
  for (const p of ['app/[lang]/flights/[slug]/route.js', 'app/(de)/flights/[slug]/route.js', 'app/(de)/city/[slug]/route.js']) {
    assert.equal(revalidateOf(p), ttl.ROUTE_PAGE_REVALIDATE_S, `${p} revalidate must equal ROUTE_PAGE_REVALIDATE_S`);
  }
});

test('sitemap routes use the documented SITEMAP_REVALIDATE_S', () => {
  for (const p of ['app/sitemap.xml/route.js', 'app/sitemap-routes.xml/route.js', 'app/sitemap-shard/[file]/route.js']) {
    assert.equal(revalidateOf(p), ttl.SITEMAP_REVALIDATE_S, `${p} revalidate must equal SITEMAP_REVALIDATE_S`);
  }
});
