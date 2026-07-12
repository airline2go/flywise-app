// [COMPARE CLI] Diff shots/legacy vs shots/candidate pixel-by-pixel and emit:
//   - shots/diff/<key>.png        a red-highlighted difference image
//   - shots/report.json           machine-readable results
//   - shots/report.html           a side-by-side (legacy | candidate | diff) report
//
//   node compare.mjs
//
// A shot passes when diffPixels <= its page's maxDiffPixels (0 by default:
// truly identical). Size mismatches (different rendered height/width) are a
// hard fail — that alone is a layout regression.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

import { PAGES, DEFAULT_MAX_DIFF_PIXELS, PIXELMATCH_THRESHOLD } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots');
const LEGACY = path.join(SHOTS, 'legacy');
const CANDIDATE = path.join(SHOTS, 'candidate');
const DIFF = path.join(SHOTS, 'diff');

const maxDiffForPage = (pageId) => {
  const p = PAGES.find((x) => x.id === pageId);
  return p && typeof p.maxDiffPixels === 'number' ? p.maxDiffPixels : DEFAULT_MAX_DIFF_PIXELS;
};

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

// Pad two PNGs to a common canvas so a height/width difference is itself
// rendered as a diff region rather than crashing pixelmatch.
function toCommonCanvas(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0);
  return out;
}

async function main() {
  const manifestPath = path.join(LEGACY, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('No legacy baseline found — run `node capture.mjs --target=legacy` first.');
    process.exit(2);
  }
  const { shots } = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  await fsp.rm(DIFF, { recursive: true, force: true });
  await fsp.mkdir(DIFF, { recursive: true });

  const results = [];
  for (const shot of shots) {
    const { key } = shot;
    const legacyFile = path.join(LEGACY, `${key}.png`);
    const candFile = path.join(CANDIDATE, `${key}.png`);

    if (!fs.existsSync(candFile)) {
      results.push({ ...shot, status: 'MISSING_CANDIDATE', diffPixels: null });
      continue;
    }

    const a = readPng(legacyFile);
    const b = readPng(candFile);
    const width = Math.max(a.width, b.width);
    const height = Math.max(a.height, b.height);
    const sizeMismatch = a.width !== b.width || a.height !== b.height;

    const ca = toCommonCanvas(a, width, height);
    const cb = toCommonCanvas(b, width, height);
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(ca.data, cb.data, diff.data, width, height, {
      threshold: PIXELMATCH_THRESHOLD,
      includeAA: true,
    });
    fs.writeFileSync(path.join(DIFF, `${key}.png`), PNG.sync.write(diff));

    const budget = maxDiffForPage(shot.page);
    const totalPixels = width * height;
    const status = diffPixels <= budget && !sizeMismatch ? 'PASS' : 'FAIL';
    results.push({
      ...shot,
      status,
      diffPixels,
      totalPixels,
      diffRatio: +(diffPixels / totalPixels).toFixed(6),
      sizeMismatch,
      legacySize: `${a.width}x${a.height}`,
      candidateSize: `${b.width}x${b.height}`,
      budget,
    });
  }

  const summary = {
    comparedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    missing: results.filter((r) => r.status === 'MISSING_CANDIDATE').length,
  };
  await fsp.writeFile(path.join(SHOTS, 'report.json'), JSON.stringify({ summary, results }, null, 2));
  await fsp.writeFile(path.join(SHOTS, 'report.html'), renderHtml(summary, results));

  console.log('\n── Visual parity ──────────────────────────────');
  for (const r of results) {
    const mark = r.status === 'PASS' ? '✓' : '✗';
    const detail =
      r.status === 'MISSING_CANDIDATE'
        ? 'no candidate screenshot'
        : `${r.diffPixels} px (${(r.diffRatio * 100).toFixed(3)}%)${r.sizeMismatch ? ` SIZE ${r.legacySize}→${r.candidateSize}` : ''}`;
    console.log(`  ${mark} ${r.key.padEnd(34)} ${detail}`);
  }
  console.log('────────────────────────────────────────────────');
  console.log(`  ${summary.passed}/${summary.total} identical · ${summary.failed} regressions · ${summary.missing} missing`);
  console.log(`  report: ${path.relative(process.cwd(), path.join(SHOTS, 'report.html'))}`);

  if (summary.failed > 0 || summary.missing > 0) process.exitCode = 1;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderHtml(summary, results) {
  const rows = results
    .map((r) => {
      const cls = r.status === 'PASS' ? 'pass' : 'fail';
      const imgs =
        r.status === 'MISSING_CANDIDATE'
          ? '<td colspan="3" class="miss">candidate screenshot missing</td>'
          : `<td><img loading="lazy" src="legacy/${esc(r.key)}.png"></td>
             <td><img loading="lazy" src="candidate/${esc(r.key)}.png"></td>
             <td><img loading="lazy" src="diff/${esc(r.key)}.png"></td>`;
      const metric =
        r.diffPixels == null ? '—' : `${r.diffPixels} px<br><small>${(r.diffRatio * 100).toFixed(3)}%</small>`;
      return `<tr class="${cls}">
        <td class="key">${esc(r.key)}<br><small>${esc(r.url || '')}</small></td>
        <td class="status ${cls}">${r.status}${r.sizeMismatch ? '<br><small>size</small>' : ''}</td>
        <td class="metric">${metric}</td>
        ${imgs}
      </tr>`;
    })
    .join('\n');

  return `<!doctype html><meta charset="utf-8"><title>Airpiv visual parity</title>
<style>
  body{font:14px system-ui,sans-serif;margin:0;background:#0f1420;color:#e6e9ef}
  header{padding:16px 20px;position:sticky;top:0;background:#0f1420;border-bottom:1px solid #24304a;z-index:2}
  h1{font-size:18px;margin:0 0 4px}
  .sum span{display:inline-block;margin-right:14px}
  .ok{color:#3fbf7f}.bad{color:#ff6b6b}
  table{border-collapse:collapse;width:100%}
  td{border-bottom:1px solid #1c2740;padding:8px;vertical-align:top}
  td.key{max-width:220px;word-break:break-all;color:#aab4c8}
  td small{color:#6b7690}
  img{max-width:320px;height:auto;border:1px solid #24304a;background:#fff}
  tr.fail{background:#2a1520}
  .status.pass{color:#3fbf7f;font-weight:700}
  .status.fail{color:#ff6b6b;font-weight:700}
  .miss,.metric{color:#c9a227}
  thead td{position:sticky;top:64px;background:#141b2b;color:#8f9bb3;font-weight:700}
</style>
<header>
  <h1>Airpiv → Next.js visual parity</h1>
  <div class="sum">
    <span>${esc(summary.comparedAt)}</span>
    <span class="ok">${summary.passed} identical</span>
    <span class="bad">${summary.failed} regressions</span>
    <span class="bad">${summary.missing} missing</span>
    <span>of ${summary.total}</span>
  </div>
</header>
<table>
  <thead><tr><td>shot</td><td>status</td><td>diff</td><td>legacy</td><td>candidate</td><td>diff map</td></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
