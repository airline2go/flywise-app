// [SEO×VISUAL COUPLING] The localized-home hardening step demotes the hidden
// booking-confirmation heading from <h1> to <h2> so the homepage exposes a
// single semantic H1 to crawlers (see scripts/prerender-localized-homes.mjs,
// hardenHomeSeoHtml). That demotion is invisible to the HTML-structure tests
// but it silently breaks the confirmation heading's styling if styles.css only
// targets `.confirm-hd h1`. This guard keeps the two in lockstep: whenever the
// heading can be an h2, the stylesheet must style the h2 identically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = readFileSync(join(webDir, 'scripts/prerender-localized-homes.mjs'), 'utf8');
const css = readFileSync(join(webDir, 'public/styles.css'), 'utf8');

test('confirm heading is demoted to h2 for the single-H1 SEO rule', () => {
  assert.ok(
    script.includes('confirm_title') && script.includes('<h2$1>$2</h2>'),
    'hardenHomeSeoHtml must still demote the confirm_title <h1> to <h2>',
  );
});

test('styles.css styles the demoted confirm heading (.confirm-hd h2)', () => {
  // The demoted heading renders as <h2> in production; the stylesheet must
  // still apply the confirmation-header treatment to it.
  assert.ok(
    /\.confirm-hd\s+h2\b/.test(css) || /\.confirm-hd\s+h1\s*,\s*\.confirm-hd\s+h2\b/.test(css),
    'public/styles.css must style `.confirm-hd h2` so the SEO-demoted heading keeps its visual treatment',
  );
});
