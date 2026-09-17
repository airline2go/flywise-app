import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(ROOT, 'lib', 'content-api.js');

test('hub entity detail feeds use the same 15-minute revalidation as route evidence', async () => {
  const source = await readFile(sourcePath, 'utf8');
  const expected = [
    "fetchDetailOrNull(`/cities/${encodeURIComponent(slug)}`, { revalidate: ROUTE_DETAIL_REVALIDATE })",
    "fetchDetailOrNull(`/countries/${encodeURIComponent(code)}`, { revalidate: ROUTE_DETAIL_REVALIDATE })",
    "fetchDetailOrNull(`/airports/${encodeURIComponent(code)}`, { revalidate: ROUTE_DETAIL_REVALIDATE })",
    "fetchDetailOrNull(`/airlines/${encodeURIComponent(code)}`, { revalidate: ROUTE_DETAIL_REVALIDATE })",
  ];
  for (const call of expected) assert.ok(source.includes(call), `missing hub cache policy: ${call}`);
});
