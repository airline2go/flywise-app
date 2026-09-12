// [P1.6] No static page in web/public may ship an EMPTY or INVALID JSON-LD
// block in its initial HTML. An empty `{}` (or a schema whose only keys are
// @context/@type) describes no content and is exactly the placeholder anti-
// pattern we removed from cheap-flights.html / last-minute-flights.html — a
// page's structured data must describe content that is actually on the page.
//
// A build-injected placeholder is allowed ONLY when it carries an id a deploy
// script fills (e.g. blog.html's ItemList, populated by prerender-blog-list),
// so those are exempted by id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ids of ld+json blocks a build step populates at deploy time (safe to be empty
// in source). Keep this list tight and justified.
const BUILD_INJECTED_IDS = new Set(['itemlist-schema']); // blog.html, filled by prerender-blog-list

const LD_RE = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
const ID_RE = /\bid="([^"]+)"/i;

function isEmptySchema(obj) {
  if (Array.isArray(obj)) return obj.length === 0;
  if (obj && typeof obj === 'object') {
    const meaningful = Object.keys(obj).filter((k) => !k.startsWith('@'));
    return meaningful.length === 0 || meaningful.every((k) => {
      const v = obj[k];
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
  }
  return false;
}

test('no static page ships an empty or invalid JSON-LD block in its initial HTML', () => {
  const files = readdirSync(publicDir).filter((f) => f.endsWith('.html'));
  const offenders = [];
  for (const f of files) {
    const html = readFileSync(join(publicDir, f), 'utf8');
    let m;
    LD_RE.lastIndex = 0;
    while ((m = LD_RE.exec(html))) {
      const tag = m[0].slice(0, m[0].indexOf('>') + 1);
      const idm = tag.match(ID_RE);
      if (idm && BUILD_INJECTED_IDS.has(idm[1])) continue; // deploy-filled placeholder
      const body = m[1].trim();
      if (!body) { offenders.push(`${f}: empty ld+json body`); continue; }
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) { offenders.push(`${f}: invalid JSON (${e.message})`); continue; }
      if (isEmptySchema(parsed)) offenders.push(`${f}: placeholder/empty schema ${body.slice(0, 40)}`);
    }
  }
  assert.equal(offenders.length, 0, `empty/invalid JSON-LD found:\n${offenders.join('\n')}`);
});
