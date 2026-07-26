// [ASSET-VERSION-STAMP] Runs before `next build`.
//
// The SPA (public/index.html) references CSS/JS at FIXED, unhashed paths
// (/app.js, /styles.css, /popular-routes.js). Their URL never changes when
// their content does, so the CDN/edge can keep serving an old file next to a
// freshly-updated index.html — the cache skew that repeatedly hid fixes from
// users (even `Cache-Control: max-age=0` gets overridden to a positive
// max-age at the platform edge).
//
// This stamps a short content-hash query (`?v=<hash>`) onto each of those
// references. A content change → new hash → new URL → new cache key, so the
// updated file reaches users immediately, while unchanged files keep a stable
// URL and stay cacheable.
//
// Deliberately defensive: any problem here logs a warning and exits 0 so it
// can never break a deployment — the worst case is falling back to today's
// (already shipped) manual stamps.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

try {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');
  const assets = ['app.js', 'styles.css', 'popular-routes.js'];

  if (!existsSync(indexPath)) {
    console.warn('[stamp-assets] public/index.html not found — skipping');
    process.exit(0);
  }

  let html = readFileSync(indexPath, 'utf8');
  const stamped = [];

  for (const asset of assets) {
    const assetPath = join(publicDir, asset);
    if (!existsSync(assetPath)) {
      console.warn(`[stamp-assets] ${asset} not found — skipping`);
      continue;
    }
    const hash = createHash('sha256').update(readFileSync(assetPath)).digest('hex').slice(0, 10);
    // Match the reference inside its quotes, with or without an existing ?v=,
    // and re-stamp with the current hash. Same quote char is preserved.
    const escaped = asset.replace(/[.]/g, '\\$&');
    const re = new RegExp('(["\'])/' + escaped + '(?:\\?v=[a-f0-9]+)?\\1', 'g');
    let hits = 0;
    html = html.replace(re, (_m, q) => { hits++; return q + '/' + asset + '?v=' + hash + q; });
    if (hits > 0) stamped.push(`${asset}?v=${hash} (${hits})`);
  }

  writeFileSync(indexPath, html);
  console.log('[stamp-assets] stamped:', stamped.length ? stamped.join(', ') : '(no references found)');
} catch (err) {
  console.warn('[stamp-assets] non-fatal error, skipping:', err && err.message);
}
process.exit(0);
