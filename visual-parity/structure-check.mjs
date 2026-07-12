// [STRUCTURE-CHECK CLI] DOM/content parity checker. Fetches two pages' raw
// HTML (what a crawler sees) and reports, per facet, how closely the new page
// matches the old — naming every difference. Complements the pixel harness:
// it runs on the SEO entity pages (city/airport/…) where a screenshot diff
// needs live data, because it compares the server-rendered HTML directly.
//
// Single page (the common SEO check — old production vs new):
//   node structure-check.mjs \
//     --legacy=https://airpiv.com/city/berlin \
//     --candidate=https://flywise-app-amber.vercel.app/city/berlin
//
// Whole page list from config.mjs, across two hosts:
//   node structure-check.mjs \
//     --legacy-base=https://airpiv.com \
//     --candidate-base=https://flywise-app-amber.vercel.app
//
// Legacy static pages locally: omit --legacy-base and it serves the repo.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGES, TARGETS } from './config.mjs';
import { startStaticServer } from './lib/staticServer.mjs';
import { legacyUrlFor, candidateUrlFor } from './lib/paths.mjs';
import { analyzeHtml, externalStylesheetUrls, cssRules } from './lib/htmlAnalyze.mjs';
import { structDiff } from './lib/structDiff.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UA =
  'Mozilla/5.0 (compatible; AirpivParityBot/1.0; structure-check)';

function arg(name) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
}

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// The page's own origin, so it can be normalized to a constant host and
// same-page links/JSON-LD/canonical stop reading as differences.
function originOf(u) {
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

// Fetch + flatten the rule contents of every stylesheet a page links, so CSS
// is compared by what it actually declares rather than by bundle URL.
async function resolveExternalCss(html, pageUrl) {
  const urls = externalStylesheetUrls(html, pageUrl);
  const rules = [];
  for (const u of urls) {
    try {
      rules.push(...cssRules(await fetchText(u, 'text/css')));
    } catch {
      /* a stylesheet that 404s just contributes no rules */
    }
  }
  return rules;
}

// Fetch a page and produce its analysis with host + CSS normalization applied.
// `siteOrigins` is every host that refers to "this site" — both serving hosts
// and the canonical production domain — all collapsed to https://SITE so that
// e.g. a canonical/hreflang/JSON-LD pointing at the production domain matches
// on both the production page and a preview deployment.
async function analyzePage(url, siteOrigins) {
  const html = await fetchText(url);
  const externalCssRules = await resolveExternalCss(html, url);
  let normalized = html;
  for (const o of siteOrigins) normalized = normalized.split(o).join('https://SITE');
  return analyzeHtml(normalized, { externalCssRules });
}

const pct = (s) => (s >= 0.99995 ? '100%' : `${(s * 100).toFixed(1)}%`);
const mark = (ok) => (ok ? '✅' : '⚠');

function printReport(name, url, cand, diff) {
  const c = diff.categories;
  console.log(`\nPage: ${name}`);
  console.log(`  legacy    : ${url.legacy}`);
  console.log(`  candidate : ${url.candidate}`);
  console.log(`${mark(c.text.diffs === 0)} Text: ${pct(c.text.score)}`);
  console.log(`${mark(c.links.diffs === 0)} Links: ${pct(c.links.score)}`);
  console.log(`${mark(c.images.diffs === 0)} Images: ${pct(c.images.score)}`);
  console.log(`${mark(c.structuredData.diffs === 0)} Structured Data: ${pct(c.structuredData.score)}`);
  console.log(`${mark(c.meta.diffs === 0)} Meta Tags: ${pct(c.meta.score)}`);
  console.log(`${mark(c.css.diffs === 0)} CSS differences: ${c.css.diffs}`);
  console.log(`${mark(c.layout.diffs === 0)} Layout differences: ${c.layout.diffs}`);
  console.log(`Overall Match: ${pct(diff.overall)}`);

  // Name every drift so a <100% page is actionable.
  const detail = (label, cat) => {
    if (!cat.diffs) return;
    const lines = cat.samples && cat.samples.length ? cat.samples : [`${cat.diffs} difference(s)`];
    console.log(`   ↳ ${label}:`);
    for (const l of lines) console.log(`       ${l}`);
  };
  detail('Text', c.text);
  detail('Links', c.links);
  detail('Images', c.images);
  detail('Structured Data', c.structuredData);
  detail('Meta Tags', c.meta);
  detail('CSS', c.css);
  detail('Layout', c.layout);
}

async function compareOne(name, url) {
  // Every host that means "this site": both serving origins + the canonical
  // production domain (override with --prod-origin=…). All map to https://SITE.
  const prodOrigin = arg('prod-origin') || 'https://airpiv.com';
  const siteOrigins = [...new Set([originOf(url.legacy), originOf(url.candidate), prodOrigin].filter(Boolean))];
  const [a, b] = await Promise.all([analyzePage(url.legacy, siteOrigins), analyzePage(url.candidate, siteOrigins)]);
  const diff = structDiff(a, b);
  printReport(name, url, null, diff);
  return { name, url, overall: diff.overall, categories: summarize(diff) };
}

const summarize = (diff) =>
  Object.fromEntries(Object.entries(diff.categories).map(([k, v]) => [k, { score: v.score, diffs: v.diffs, samples: v.samples || [] }]));

async function main() {
  const single = arg('legacy') && arg('candidate');
  const results = [];
  let server = null;

  try {
    if (single) {
      const name = arg('name') || new URL(arg('candidate')).pathname || 'page';
      results.push(await compareOne(name, { legacy: arg('legacy'), candidate: arg('candidate') }));
    } else {
      let legacyBase = arg('legacy-base');
      const candidateBase = arg('candidate-base') || TARGETS.candidate.base;
      if (!legacyBase) {
        server = await startStaticServer({ docRoot: TARGETS.legacy.docRoot, port: TARGETS.legacy.port, notFoundFile: '404.html' });
        legacyBase = server.url;
        console.log(`[legacy] serving repo at ${legacyBase}`);
      }
      for (const page of PAGES) {
        for (const lang of page.langs) {
          let legacy;
          try {
            legacy = legacyUrlFor(legacyBase, page, lang);
          } catch {
            continue;
          }
          const candidate = candidateUrlFor(candidateBase, page, lang);
          const name = `${page.id} [${lang}]`;
          try {
            results.push(await compareOne(name, { legacy, candidate }));
          } catch (e) {
            console.error(`\n✗ ${name}: ${e.message}`);
            results.push({ name, url: { legacy, candidate }, error: e.message });
          }
        }
      }
    }
  } finally {
    if (server) await server.close();
  }

  const outPath = path.join(HERE, 'shots', 'structure-report.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const failing = results.filter((r) => r.error || (r.overall !== undefined && r.overall < 0.99995));
  console.log(`\n────────────────────────────────────────────────`);
  console.log(`  ${results.length - failing.length}/${results.length} pages 100% · report: ${path.relative(process.cwd(), outPath)}`);
  if (failing.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
