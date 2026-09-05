// [SITEMAP-AUDIT] P0-7 — automated sitemap ↔ indexability consistency audit.
//
// The invariant (plan P0-17): every URL in a sitemap must be an intended-
// indexable, self-canonical, HTTP-200 page — never a noindex, redirect, or
// error page, and never a duplicate. Sitemap membership is decided by the
// backend's `indexable` flag; the rendered robots meta is decided by the
// renderer's own thin/critical thresholds (lib/legacy-render/indexability.js).
// Those two judgements can DRIFT — this audit catches the drift with evidence.
//
// It runs against a live base URL and:
//   1. Fetches the sitemap index + every child sitemap and collects all <loc>s.
//   2. STRUCTURAL (all URLs, no fetch): no duplicates across sitemaps, every loc
//      absolute-https on the canonical host, no forbidden path shapes
//      (lib/seo/sitemap-membership.mjs).
//   3. LIVE (a spread sample per child): fetch each and assert via the
//      smoke-contract 'sitemap' profile — 200, NOT noindex, self-canonical.
//
// Usage:
//   node scripts/audit-sitemap.mjs [--base=https://airpiv.com] [--sample=10]
//        [--json] [--timeout=20000]
//
// Exit: 0 clean · 1 a structural or live violation · 2 sitemap undiscoverable.

import { evaluatePage, summarize } from '../lib/seo/smoke-contract.mjs';
import { structuralAudit, spreadSample, classifyChildSitemap } from '../lib/seo/sitemap-membership.mjs';

const UA = 'AirpivSitemapAudit/1.0 (+https://airpiv.com; sitemap-indexability check)';

function parseArgs(argv) {
  const args = { base: 'https://airpiv.com', sample: 10, json: false, timeout: 20000 };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a.startsWith('--base=')) args.base = a.slice(7).replace(/\/$/, '');
    else if (a.startsWith('--sample=')) args.sample = Math.max(1, parseInt(a.slice(9), 10) || 10);
    else if (a.startsWith('--timeout=')) args.timeout = Math.max(1000, parseInt(a.slice(10), 10) || 20000);
  }
  return args;
}

async function fetchText(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

async function fetchPage(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'manual' });
    const contentType = res.headers.get('content-type') || '';
    const html = await res.text();
    return { status: res.status, contentType, html, bytes: Buffer.byteLength(html, 'utf8') };
  } catch (e) {
    return { status: 0, contentType: '', html: '', bytes: 0, error: e.message };
  } finally { clearTimeout(timer); }
}

const extractLocs = (xml) => (xml ? [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]) : []);
const rebase = (url, base) => { try { const u = new URL(url); return `${base}${u.pathname}${u.search}`; } catch { return url; } };

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const indexXml = await fetchText(`${args.base}/sitemap.xml`, args.timeout);
  if (indexXml === null) {
    console.error(`FATAL: could not fetch ${args.base}/sitemap.xml`);
    process.exit(2);
  }
  const childSitemaps = extractLocs(indexXml);

  // Collect every URL from every child sitemap, tagged with its child.
  // [P1-6] A child that is unreachable (non-2xx / network / timeout) or returns
  // a body that isn't a valid sitemap is a CRITICAL failure — recorded here and
  // failing the whole audit — NOT silently treated as an empty URL list.
  const byChild = new Map();
  const allEntries = [];
  const childFailures = [];
  for (const child of childSitemaps) {
    const xml = await fetchText(rebase(child, args.base), args.timeout);
    const verdict = classifyChildSitemap(xml);
    if (verdict !== 'ok') {
      childFailures.push({ child, reason: verdict === 'unreachable' ? 'unreachable / non-2xx' : 'not valid sitemap XML' });
      continue;
    }
    const locs = extractLocs(xml);
    byChild.set(child, locs);
    for (const loc of locs) allEntries.push({ loc, sitemap: child });
  }

  // ── structural audit (all URLs) ──────────────────────────────────────────
  const structural = structuralAudit(allEntries);

  // ── live audit (spread sample per child) ─────────────────────────────────
  const liveResults = [];
  for (const [, locs] of byChild) {
    for (const loc of spreadSample(locs, args.sample)) {
      const resp = await fetchPage(rebase(loc, args.base), args.timeout);
      if (resp.error) {
        liveResults.push({ url: loc, profile: 'sitemap', ok: false, checks: [{ name: 'fetch', level: 'error', ok: false, detail: resp.error }] });
        continue;
      }
      liveResults.push(evaluatePage({ url: loc, status: resp.status, contentType: resp.contentType, bytes: resp.bytes, html: resp.html, profile: 'sitemap' }));
    }
  }

  const liveSummary = summarize(liveResults);
  const liveViolations = liveResults.filter((r) => !r.ok);
  // [P1-6] Any child-sitemap fetch/parse failure fails the audit (CRITICAL).
  const failed = !structural.ok || liveViolations.length > 0 || childFailures.length > 0;

  if (args.json) {
    console.log(JSON.stringify({ base: args.base, childSitemaps, childFailures, structural, liveSummary, liveViolations }, null, 2));
  } else {
    console.log(`Sitemap audit — base ${args.base} · ${childSitemaps.length} child sitemaps · ${structural.total} URLs (${structural.unique} unique)`);
    if (childFailures.length) {
      console.log(`Child sitemaps: ❌ ${childFailures.length} CRITICAL fetch/parse failure(s)`);
      for (const f of childFailures) console.log(`  ❌ ${f.child} — ${f.reason}`);
    }
    console.log(`Structural: ${structural.ok ? '✅ clean' : '❌ VIOLATIONS'}`);
    if (structural.duplicates.length) console.log(`  duplicates: ${structural.duplicates.length} (e.g. ${structural.duplicates[0].loc} ×${structural.duplicates[0].count})`);
    if (structural.nonHttps.length) console.log(`  non-https/invalid: ${structural.nonHttps.length} (e.g. ${structural.nonHttps[0]})`);
    if (structural.wrongHost.length) console.log(`  wrong host: ${structural.wrongHost.length} (e.g. ${structural.wrongHost[0]})`);
    if (structural.forbidden.length) console.log(`  forbidden path: ${structural.forbidden.length} (e.g. ${structural.forbidden[0].loc})`);
    console.log(`Live sample: ${liveSummary.passed}/${liveSummary.total} indexable-consistent`);
    for (const v of liveViolations) {
      const errs = v.checks.filter((c) => c.level === 'error' && !c.ok);
      console.log(`  ❌ ${v.url}\n       ${errs.map((c) => `${c.name}(${c.detail})`).join(', ')}`);
    }
    console.log(failed ? '\nRESULT: ❌ sitemap has consistency violations' : '\nRESULT: ✅ sitemap is consistent with indexability');
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
