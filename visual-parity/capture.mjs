// [CAPTURE CLI] Screenshot one target (legacy or candidate) across every
// page × language × viewport into shots/<target>/.
//
//   node capture.mjs --target=legacy
//   node capture.mjs --target=candidate   (needs a Next.js server running)
//
// Legacy is served by our own static server; candidate is expected to be
// already running (CANDIDATE_BASE, default http://localhost:3000).

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TARGETS, VIEWPORTS, PAGES, RTL_LANGUAGES } from './config.mjs';
import { startStaticServer } from './lib/staticServer.mjs';
import { launchBrowser, captureOne } from './lib/capture.mjs';
import { legacyUrlFor, candidateUrlFor, shotKey } from './lib/paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(HERE, 'shots');

function parseTarget() {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  const target = arg ? arg.split('=')[1] : '';
  if (target !== 'legacy' && target !== 'candidate') {
    console.error('Usage: node capture.mjs --target=legacy|candidate');
    process.exit(2);
  }
  return target;
}

async function main() {
  const target = parseTarget();
  const outDir = path.join(SHOTS_DIR, target);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  // Bring up the source for this target.
  let base;
  let server = null;
  if (target === 'legacy') {
    server = await startStaticServer({
      docRoot: TARGETS.legacy.docRoot,
      port: TARGETS.legacy.port,
      notFoundFile: '404.html',
    });
    base = server.url;
    console.log(`[legacy] serving ${TARGETS.legacy.docRoot} at ${base}`);
  } else {
    base = TARGETS.candidate.base;
    console.log(`[candidate] expecting a server at ${base}`);
  }

  const urlFor = target === 'legacy' ? legacyUrlFor : candidateUrlFor;
  const browser = await launchBrowser();

  let total = 0;
  let failed = 0;
  const manifest = [];

  for (const page of PAGES) {
    for (const lang of page.langs) {
      let url;
      try {
        url = urlFor(base, page, lang);
      } catch (e) {
        console.warn(`  [skip] ${page.id}/${lang}: ${e.message}`);
        continue;
      }
      for (const viewport of VIEWPORTS) {
        const key = shotKey(page, lang, viewport.id);
        const outPath = path.join(outDir, `${key}.png`);
        total += 1;
        const { ok, error } = await captureOne(browser, {
          url,
          viewport,
          lang,
          rtl: RTL_LANGUAGES.has(lang),
          fullPage: page.fullPage,
          outPath,
        });
        if (ok) {
          console.log(`  ✓ ${key}`);
          manifest.push({ key, page: page.id, lang, viewport: viewport.id, url });
        } else {
          failed += 1;
          console.error(`  ✗ ${key} — ${error}`);
        }
      }
    }
  }

  await fsp.writeFile(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ target, base, capturedAt: new Date().toISOString(), shots: manifest }, null, 2),
  );

  await browser.close();
  if (server) await server.close();

  console.log(`\n[${target}] captured ${total - failed}/${total} (${failed} failed) → ${path.relative(HERE, outDir)}/`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
