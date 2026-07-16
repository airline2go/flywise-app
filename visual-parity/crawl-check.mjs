// [CRAWL-CHECK] Phase-5 health crawl. Visits a route list on two targets
// (old production + the new site) with a real browser and records, per page:
// HTTP status, console errors, uncaught page errors, and failed network
// requests. It then DIFFS new-vs-old so only *regressions* are reported —
// errors that already exist on production (blocked analytics, third-party
// widgets, etc.) are not the migration's fault and are filtered out.
//
//   node crawl-check.mjs \
//     --old=https://airpiv.com \
//     --new=https://<preview>.vercel.app
//
// Exits non-zero if the new site has any status/console/network regression.

import { chromium } from 'playwright';

function arg(name, def) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : def;
}

// Representative route per page type + language (incl. Arabic RTL), the
// customer SPA entry points, static pages, and admin login. Data-slug pages
// use known-good slugs.
const ROUTES = [
  '/', '/en', '/ar',
  '/about.html', '/contact.html', '/privacy.html', '/terms.html', '/blog.html',
  '/cheap-flights.html', '/last-minute-flights.html',
  '/city/berlin', '/en/city/berlin', '/ar/city/berlin',
  '/country/DE', '/en/country/DE',
  '/airport/BER', '/ar/airport/BER',
  '/airline/LH',
  '/flights/berlin-paris', '/en/flights/berlin-paris',
  '/blog/hamburg-nach-lissabon-der-perfekte-city-trip-zwischen-hafenstadt-und-atlantik',
  '/search/BER-CDG', '/search/multi-city',
  '/admin/login',
  '/this-page-should-404',
];

// Console/network noise present on BOTH sites (third-party, not migration-
// related) is dropped up front so the diff is meaningful even if a URL's
// query string differs between old and new.
const IGNORE = [
  'google-analytics', 'googletagmanager', 'analytics.google', 'doubleclick',
  'brevo', 'facebook', 'hotjar', 'clarity', 'stripe.com/v3', 'js.stripe.com',
  'favicon.ico', 'ERR_BLOCKED_BY_CLIENT',
  // External hosts the client JS calls — unreachable from the sandbox browser,
  // so their failures are environment artifacts, not site defects. (This is
  // why a localhost crawl is used: only same-origin/JS errors are real here.)
  'api.airpiv.com', 'supabase.co', 'qrserver.com', 'assets.duffel.com',
  'content.airhex.com', 'cdn.jsdelivr.net', 'conversations-widget',
  'ERR_CONNECTION_RESET', 'ERR_NAME_NOT_RESOLVED', 'ERR_PROXY_CONNECTION_FAILED',
];
const ignored = (s) => IGNORE.some((f) => (s || '').includes(f));

const withCap = (promise, ms, label) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`hard-cap ${label}`)), ms))]);

async function crawl(browser, base, paths) {
  if (!base || base === 'none') return Object.fromEntries(paths.map((p) => [p, { status: 0, consoleErrors: [], pageErrors: [], failed: [] }]));
  const out = {};
  for (const p of paths) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failed = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !ignored(m.text())) consoleErrors.push(m.text().slice(0, 200));
    });
    page.on('pageerror', (e) => {
      if (!ignored(e.message)) pageErrors.push(e.message.slice(0, 200));
    });
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (!ignored(u)) failed.push(`${r.failure()?.errorText || 'failed'} ${u.slice(0, 120)}`);
    });
    page.on('response', (r) => {
      const u = r.url();
      if (r.status() >= 400 && !ignored(u) && u.startsWith(base)) {
        // sub-resource 4xx/5xx (not the top-level nav — that's captured below)
        if (u !== base + p) failed.push(`HTTP ${r.status()} ${u.slice(0, 120)}`);
      }
    });
    let status = 0;
    try {
      // domcontentloaded (not networkidle) — the customer SPA long-polls the
      // backend so it never reaches network-idle; a short settle after DCL is
      // enough to surface initial-load console/page errors. A hard cap guards
      // against any page whose load event never fires.
      await withCap((async () => {
        const resp = await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 15000 });
        status = resp ? resp.status() : 0;
        await page.waitForTimeout(1200);
      })(), 18000, p);
    } catch (e) {
      pageErrors.push(`NAV: ${e.message.slice(0, 120)}`);
    }
    out[p] = { status, consoleErrors, pageErrors, failed };
    await context.close().catch(() => {});
  }
  return out;
}

const oldBase = arg('old', 'https://airpiv.com');
const newBase = arg('new');
if (!newBase) {
  console.error('Usage: node crawl-check.mjs --new=<url> [--old=<url>]');
  process.exit(2);
}

// Chromium (unlike curl/Node fetch) doesn't read HTTPS_PROXY from the env, so
// external hosts fail with ERR_CONNECTION_RESET unless the proxy is passed
// explicitly. In this sandbox all outbound HTTPS is routed through it.
// Only route through the proxy for external targets. A localhost target must
// go direct — routing localhost through the agent proxy makes it answer 405 to
// every request. (External browser crawling is unreliable here regardless, so
// the intended use is a localhost `next start`.)
const isLocal = /localhost|127\.0\.0\.1/.test(newBase);
const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  headless: true,
  ...(proxyServer && !isLocal ? { proxy: { server: proxyServer } } : {}),
});
console.log(`Crawling ${ROUTES.length} routes on OLD (${oldBase}) and NEW (${newBase})…`);
const [oldR, newR] = [await crawl(browser, oldBase, ROUTES), await crawl(browser, newBase, ROUTES)];
await browser.close();

let regressions = 0;
console.log('\n── Crawl health (NEW vs OLD) ──────────────────────────');
for (const p of ROUTES) {
  const o = oldR[p];
  const n = newR[p];
  // status regression: differs from old (404 pages are expected to match)
  const statusBad = o.status !== n.status;
  // new console/page errors that old doesn't have
  const newConsole = n.consoleErrors.filter((e) => !o.consoleErrors.includes(e));
  const newPage = n.pageErrors.filter((e) => !o.pageErrors.includes(e));
  const newFailed = n.failed.filter((e) => !o.failed.some((x) => x.split(' ')[0] === e.split(' ')[0]));
  const bad = statusBad || newConsole.length || newPage.length || newFailed.length;
  if (bad) regressions++;
  const mark = bad ? '✗' : '✓';
  let line = `${mark} ${p.padEnd(60)} old:${o.status} new:${n.status}`;
  console.log(line);
  if (statusBad) console.log(`     STATUS regression: old ${o.status} → new ${n.status}`);
  newPage.forEach((e) => console.log(`     page-error: ${e}`));
  newConsole.forEach((e) => console.log(`     console-error: ${e}`));
  newFailed.forEach((e) => console.log(`     request-failed: ${e}`));
}
console.log('────────────────────────────────────────────────────────');
console.log(`  ${ROUTES.length - regressions}/${ROUTES.length} clean · ${regressions} with regressions`);
process.exit(regressions ? 1 : 0);
