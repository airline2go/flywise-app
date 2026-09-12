// [P2.5] The meta keywords tag has no SEO value and only carried German keyword
// stuffing that leaked into every localized home. No static page may ship one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('no static page emits a <meta name="keywords"> tag', () => {
  const offenders = readdirSync(pub)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => /<meta[^>]*name=["']keywords["']/i.test(readFileSync(join(pub, f), 'utf8')));
  assert.deepEqual(offenders, [], `meta keywords found in: ${offenders.join(', ')}`);
});
