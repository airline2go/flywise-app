// P0-27 — every application/ld+json block shipped in a static public/*.html
// page must be valid, non-empty JSON in the RAW HTML (what Googlebot parses
// before any client JS). An empty `<script type="application/ld+json">` (e.g.
// a placeholder meant to be filled client-side) parses as invalid JSON-LD and
// is silently dropped — the P0-7 sitemap audit caught exactly this on
// /blog.html (an empty #itemlist-schema). This guards every static page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const htmlFiles = readdirSync(publicDir).filter((f) => f.endsWith('.html'));

// Match <script type="application/ld+json" …> … </script> (any attribute order).
const LD_JSON = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

test('every static public/*.html ships only valid, non-empty JSON-LD', () => {
  const failures = [];
  for (const file of htmlFiles) {
    const html = readFileSync(join(publicDir, file), 'utf8');
    let m;
    let idx = 0;
    while ((m = LD_JSON.exec(html)) !== null) {
      const body = m[1].trim();
      idx += 1;
      if (!body) {
        failures.push(`${file} block #${idx}: empty JSON-LD (invalid — "Unexpected end of JSON input")`);
        continue;
      }
      try {
        JSON.parse(body);
      } catch (e) {
        failures.push(`${file} block #${idx}: ${e.message}`);
      }
    }
  }
  assert.equal(failures.length, 0, `\n${failures.join('\n')}`);
});
