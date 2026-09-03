// [PHASE-45] Translation source integrity: the SEO renderer resolves every
// phrase through translations/*.json (one source, no old hardcoded dictionary).
// This test enforces that every language carries the SAME key set, so a key the
// code uses can never be missing in one language and silently fall back to
// English on a live page (the bug that left Turkish route <title>/meta in
// English because tr.json lacked routeTitle*/routeMeta*).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'translations');
const CODES = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
const dicts = Object.fromEntries(CODES.map((c) => [c, JSON.parse(readFileSync(join(dir, `${c}.json`), 'utf8'))]));

test('every language file has the identical key set', () => {
  const ref = new Set(Object.keys(dicts.en));
  for (const c of CODES) {
    const keys = new Set(Object.keys(dicts[c]));
    const missing = [...ref].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !ref.has(k));
    assert.deepEqual(missing, [], `${c}.json is MISSING keys vs en: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `${c}.json has EXTRA keys not in en: ${extra.join(', ')}`);
  }
});

test('no language has an empty-string value (silent blank on the page)', () => {
  for (const c of CODES) {
    const blanks = Object.entries(dicts[c]).filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k);
    assert.deepEqual(blanks, [], `${c}.json has blank values: ${blanks.join(', ')}`);
  }
});

test('the route title/meta keys the renderer uses exist in every language', () => {
  for (const k of ['routeTitlePrimary', 'routeTitleFacts', 'routeTitleDirect', 'routeTitleBase', 'routeMeta', 'routeMetaPrice']) {
    for (const c of CODES) assert.ok(dicts[c][k] != null, `${c}.json missing ${k}`);
  }
});
