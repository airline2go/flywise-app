// [SMOKE-TEST] P0-3 Production smoke-test driver.
//
// Fetches a representative sample of live pages and checks each against the
// shared SEO/rendering contract in lib/seo/smoke-contract.mjs. Intended to run
// AFTER a deployment (against production or a preview URL) — it is the gate
// that proves a deploy actually serves valid, indexable HTML, not just 200s.
//
// It does NOT hardcode slugs: the SSR sample (route / city / country / airport
// / airline / blog) is DISCOVERED from the live sitemap index at run time, so
// the suite stays correct as content changes. The language homepages are built
// from lib/languages.js (the same source of truth the site renders from).
//
// Usage:
//   node scripts/smoke-test.mjs [--base=https://airpiv.com] [--sample=1]
//        [--json] [--ua=smoke|googlebot] [--timeout=20000] [--warn-as-error]
//
//   --base           origin to test (default https://airpiv.com). Point at a
//                    Vercel preview URL to smoke a PR before promoting it.
//   --sample         SSR URLs to pull per entity type from each sitemap (def 1).
//   --json           emit the full machine-readable report as JSON.
//   --ua             smoke (default, honest identifying UA) | googlebot
//                    (Googlebot UA, for P0-29 bot-parity checks). Both are
//                    allow-listed by the edge middleware.
//   --timeout        per-request timeout in ms (default 20000).
//   --warn-as-error  exit non-zero if any WARN-level check fails too.
//
// Exit codes: 0 all pages passed · 1 one or more pages failed (or a fetch
// error) · 2 could not even discover the sitemap (infrastructure failure).

import { evaluatePage, formatResults, summarize } from '../lib/seo/smoke-contract.mjs';
import { LANGUAGE_CODES, pathFor } from '../lib/languages.js';

const UAS = {
  smoke: 'AirpivSmokeTest/1.0 (+https://airpiv.com; post-deploy contract check)',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

// Entity sitemaps to sample, mapped to the profile their pages use. All are
// server-rendered, so all use the strict 'ssr' contract.
const ENTITY_SITEMAPS = ['routes', 'cities', 'countries', 'airports', 'airlines', 'blog'];

function parseArgs(argv) {
  const args = { base: 'https://airpiv.com', sample: 1, json: false, ua: 'smoke', timeout: 20000, warnAsError: false };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--warn-as-error') args.warnAsError = true;
    else if (a.startsWith('--base=')) args.base = a.slice(7).replace(/\/$/, '');
    else if (a.startsWith('--sample=')) args.sample = Math.max(1, parseInt(a.slice(9), 10) || 1);
    else if (a.startsWith('--ua=')) args.ua = a.slice(5) in UAS ? a.slice(5) : 'smoke';
    else if (a.startsWith('--timeout=')) args.timeout = Math.max(1000, parseInt(a.slice(10), 10) || 20000);
  }
  return args;
}

async function fetchPage(url, ua, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: controller.signal,
    });
    const contentType = res.headers.get('content-type') || '';
    const html = await res.text();
    return { status: res.status, contentType, html, bytes: Buffer.byteLength(html, 'utf8') };
  } catch (e) {
    return { status: 0, contentType: '', html: '', bytes: 0, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, ua, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': ua }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

// Rebase a sitemap-discovered absolute URL onto the tested origin, so a run
// against a preview URL checks the preview's own pages (the sitemap still
// prints production URLs).
function rebase(url, base) {
  try {
    const u = new URL(url);
    return `${base}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

async function discoverSsrUrls(base, ua, timeout, sample) {
  const indexXml = await fetchText(`${base}/sitemap.xml`, ua, timeout);
  if (indexXml === null) return null; // infrastructure failure
  const childMap = new Map(); // entity -> child sitemap URL
  for (const loc of extractLocs(indexXml)) {
    const m = loc.match(/sitemap-([a-z]+)\.xml/);
    if (m) childMap.set(m[1], loc);
  }
  const urls = [];
  for (const entity of ENTITY_SITEMAPS) {
    const child = childMap.get(entity);
    if (!child) continue;
    const xml = await fetchText(rebase(child, base), ua, timeout);
    const locs = extractLocs(xml).slice(0, sample);
    for (const loc of locs) urls.push({ url: rebase(loc, base), profile: 'ssr', kind: entity });
  }
  return urls;
}

function homepageUrls(base) {
  // Every language home; DEFAULT_LANGUAGE ('de') is the unprefixed root.
  // Profile 'spa-home' because these are the client-localized static index.html
  // ([VERBATIM-HOME]) — see smoke-contract.mjs for why the contract is lenient.
  //
  // pathFor(code, '') yields a TRAILING slash for a prefixed language
  // ('/en/') but production canonicalizes the language home to no trailing
  // slash ('/en' → 200, '/en/' → 308). Strip it so we request the served URL,
  // not its redirect; the bare root ('/') is kept as-is.
  return LANGUAGE_CODES.map((code) => {
    let path = pathFor(code, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return { url: `${base}${path}`, profile: 'spa-home', kind: `home:${code}` };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ua = UAS[args.ua];

  const homepages = homepageUrls(args.base);
  const ssr = await discoverSsrUrls(args.base, ua, args.timeout, args.sample);

  if (ssr === null) {
    console.error(`FATAL: could not fetch ${args.base}/sitemap.xml — cannot discover pages to smoke.`);
    process.exit(2);
  }

  const targets = [...homepages, ...ssr];
  const results = [];
  for (const t of targets) {
    const resp = await fetchPage(t.url, ua, args.timeout);
    if (resp.error) {
      results.push({ url: t.url, profile: t.profile, ok: false, checks: [{ name: 'fetch', level: 'error', ok: false, detail: resp.error }] });
      continue;
    }
    results.push(evaluatePage({ url: t.url, status: resp.status, contentType: resp.contentType, bytes: resp.bytes, html: resp.html, profile: t.profile }));
  }

  const s = summarize(results);

  if (args.json) {
    console.log(JSON.stringify({ base: args.base, ua: args.ua, summary: s, results }, null, 2));
  } else {
    console.log(`Airpiv production smoke test — base ${args.base} · UA ${args.ua} · ${targets.length} pages`);
    console.log(formatResults(results));
  }

  const warnFail = args.warnAsError && s.warnChecks > 0;
  process.exit(s.failed > 0 || warnFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
