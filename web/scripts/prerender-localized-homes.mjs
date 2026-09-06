// [P2-4] Runs LAST in the build chain (after stamp-assets stamped index.html).
//
// Emits a build-time public/<lang>.html for each prefixed home language, derived
// from the (already popular-routes-injected + asset-stamped) public/index.html,
// with a SELF canonical and localized <html lang>/title/description/OG so the raw
// HTML Googlebot sees on /en, /ar, … is correct on first byte instead of German
// canonicalising to the root (the P2-4 finding). next.config.mjs rewrites each
// /<lang> to /<lang>.html. No URL changes; German root keeps serving index.html.
//
// Deliberately defensive (same contract as the other prerender scripts): any
// problem logs a warning and exits 0 so it can never break a deployment. Because
// index.html is committed and always present, and every generated file is written
// from it, the rewrite targets always exist after a successful build.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HOME_LANGS, localizeHomeHtml } from '../lib/home-i18n.mjs';

function main() {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.warn('[prerender-localized-homes] public/index.html not found — skipping');
    return;
  }
  const src = readFileSync(indexPath, 'utf8');
  let wrote = 0;
  for (const lang of HOME_LANGS) {
    try {
      const html = localizeHomeHtml(src, lang);
      writeFileSync(join(publicDir, `${lang}.html`), html);
      wrote++;
    } catch (err) {
      // Never let one language break the build; fall back to the German file so
      // the /<lang> → /<lang>.html rewrite target still exists and serves.
      console.warn(`[prerender-localized-homes] ${lang} failed, writing verbatim copy:`, err && err.message);
      try { writeFileSync(join(publicDir, `${lang}.html`), src); wrote++; } catch { /* give up on this lang */ }
    }
  }
  console.log(`[prerender-localized-homes] wrote ${wrote}/${HOME_LANGS.length} localized home files`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try { main(); } catch (err) {
    console.warn('[prerender-localized-homes] non-fatal error, skipping:', err && err.message);
  }
  process.exit(0);
}

export { main };
