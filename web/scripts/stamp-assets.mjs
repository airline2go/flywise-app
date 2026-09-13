// [ASSET-VERSION-STAMP] Runs before `next build`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

try {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');
  const assets = ['app.js', 'styles.css', 'popular-routes.js', 'search-session.js'];

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
