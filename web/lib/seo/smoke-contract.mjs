// [SMOKE-CONTRACT] P0-3 Production smoke-test contract.
//
// Pure, network-free evaluation of a single fetched page against the SEO/
// rendering contract the plan requires: it is NOT enough for a page to be
// HTTP 200 — the raw HTML (what Googlebot parses before any client JS) must
// actually carry the title, description, robots, canonical, hreflang, H1,
// main content, JSON-LD and internal links we expect.
//
// This module only inspects an already-fetched { status, contentType, html }.
// The network driver lives in scripts/smoke-test.mjs; keeping the judgement
// here (a) makes it unit-testable against fixtures in the blocking `web` CI
// job, and (b) gives every caller (smoke run, future dashboard, crawl audit)
// one shared definition of "a valid page" instead of re-deciding per script.
//
// Two profiles, because Airpiv renders two fundamentally different page kinds:
//
//   • 'ssr'      — the server-rendered route/entity/blog pages
//                  (web/app/[lang]/…/route.js). Full contract is enforced:
//                  these MUST be correct in the first byte.
//
//   • 'spa-home' — the language homepages. On production every language home
//                  is the SAME static public/index.html, localized CLIENT-SIDE
//                  by app.js from the URL path ([VERBATIM-HOME] in
//                  next.config.mjs). So per-language <title>/<html lang>/
//                  canonical are NOT expected to be correct in the raw HTML —
//                  that is the known P0-15 gap. Here we only assert the page is
//                  a real, non-empty HTML document and RECORD (info, never
//                  error) what its pre-JS metadata actually is, so P0-15 can be
//                  measured over time without this suite red-flagging the
//                  by-design client localization.

import { parse } from 'node-html-parser';

const SEVERITY = { ERROR: 'error', WARN: 'warn', INFO: 'info' };

// Minimum raw-HTML byte size below which an SSR page is almost certainly an
// error/empty shell rather than a real rendered page. Real route pages are
// ~30KB+; entity pages similar. 4KB is a deliberately low floor to catch
// truncated/empty responses without false-positiving on a lean valid page.
const SSR_MIN_BYTES = 4096;
// Minimum count of visible main-content characters for an SSR page to be more
// than a thin shell. Route pages carry thousands; this floor only catches
// genuinely empty bodies.
const SSR_MIN_CONTENT_CHARS = 300;
// Minimum internal links for an SSR page — every real page links to at least
// its breadcrumb + a few related routes/entities. A page with none is orphaned
// or broken.
const SSR_MIN_INTERNAL_LINKS = 3;

function check(name, level, ok, detail) {
  return { name, level, ok, detail: detail ?? '' };
}

// Normalize a URL for self-canonical comparison: drop the fragment, drop a
// trailing slash (except root), lowercase the host+scheme. Query strings are
// preserved (a canonical that drops a meaningful query would be a real finding,
// but our indexable pages carry none — see P0-28).
export function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return u;
  }
}

function firstContentType(contentType) {
  return (contentType || '').split(';')[0].trim().toLowerCase();
}

function metaContent(root, selector) {
  const el = root.querySelector(selector);
  return el ? (el.getAttribute('content') || '').trim() : null;
}

function collectJsonLd(root) {
  const blocks = root.querySelectorAll('script[type="application/ld+json"]');
  const results = [];
  for (const b of blocks) {
    const raw = b.rawText ?? b.text ?? '';
    try {
      JSON.parse(raw);
      results.push({ ok: true });
    } catch (e) {
      results.push({ ok: false, error: e.message });
    }
  }
  return results;
}

function countInternalLinks(root, host) {
  const anchors = root.querySelectorAll('a[href]');
  let count = 0;
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('/') && !href.startsWith('//')) {
      count += 1;
    } else if (host && href.includes(`//${host}`)) {
      count += 1;
    }
  }
  return count;
}

// Evaluate one fetched page.
//   input: { url, status, contentType, bytes, html, profile, expected? }
//     expected.canonical — the URL the page's canonical SHOULD equal
//                           (defaults to `url`); pass the localized/absolute
//                           form when the requested URL differs from canonical.
//   returns: { url, profile, ok, checks: [{name, level, ok, detail}] }
//            ok === no ERROR-level check failed.
export function evaluatePage(input) {
  const { url, status, contentType, bytes, html, profile = 'ssr', expected = {} } = input;
  const checks = [];
  const isSsr = profile === 'ssr';
  const errLevel = isSsr ? SEVERITY.ERROR : SEVERITY.INFO;

  // ── transport ──────────────────────────────────────────────────────────
  checks.push(check('http-status', SEVERITY.ERROR, status === 200, `status=${status}`));
  const ct = firstContentType(contentType);
  checks.push(check('content-type', SEVERITY.ERROR, ct === 'text/html', `content-type=${ct || '∅'}`));

  const size = typeof bytes === 'number' ? bytes : Buffer.byteLength(html || '', 'utf8');
  checks.push(check(
    'html-size',
    isSsr ? SEVERITY.ERROR : SEVERITY.INFO,
    isSsr ? size >= SSR_MIN_BYTES : size > 0,
    `${size} bytes`,
  ));

  // If we did not even get HTML, stop here with what we have.
  if (ct !== 'text/html' || !html) {
    const ok = !checks.some((c) => c.level === SEVERITY.ERROR && !c.ok);
    return { url, profile, ok, checks };
  }

  const root = parse(html);
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { /* ignore */ }

  // ── title ─────────────────────────────────────────────────────────────
  const titleEl = root.querySelector('title');
  const title = titleEl ? titleEl.text.trim() : '';
  checks.push(check('title', errLevel, title.length > 0, title ? `“${title.slice(0, 80)}”` : 'missing'));
  // Length sanity is a warning only (Google truncates ~60 chars but does not
  // penalize a long title); never mass-fail on this.
  if (title) {
    checks.push(check('title-length', SEVERITY.WARN, title.length >= 10 && title.length <= 70, `${title.length} chars`));
  }

  // ── meta description ────────────────────────────────────────────────────
  const desc = metaContent(root, 'meta[name="description"]');
  checks.push(check('meta-description', errLevel, !!desc && desc.length > 0, desc ? `${desc.length} chars` : 'missing'));

  // ── robots ──────────────────────────────────────────────────────────────
  const robots = metaContent(root, 'meta[name="robots"]');
  // A missing robots tag means "index,follow" by default — for an SSR page we
  // want it explicit, but its ABSENCE is a warning, not an error. What is
  // recorded (info) is the value, so an unexpected noindex spike is visible.
  checks.push(check('robots-present', SEVERITY.WARN, !!robots, robots || 'missing (defaults to index,follow)'));
  const isNoindex = !!robots && /noindex/i.test(robots);
  checks.push(check('robots-value', SEVERITY.INFO, true, robots ? robots : 'index,follow (implicit)'));

  // ── canonical ───────────────────────────────────────────────────────────
  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl ? (canonicalEl.getAttribute('href') || '').trim() : '';
  checks.push(check('canonical-present', errLevel, canonical.length > 0, canonical || 'missing'));
  if (canonical) {
    checks.push(check('canonical-absolute', errLevel, /^https:\/\//i.test(canonical), canonical));
    const want = normalizeUrl(expected.canonical || url);
    const got = normalizeUrl(canonical);
    // Self-canonical is the policy for indexable pages (P0-12). A canonical
    // pointing elsewhere is only an ERROR on an indexable SSR page; on a
    // noindex page a cross-canonical can be legitimate, so downgrade to warn.
    checks.push(check(
      'canonical-self',
      isSsr && !isNoindex ? SEVERITY.ERROR : SEVERITY.WARN,
      got === want,
      got === want ? got : `got ${got} want ${want}`,
    ));
  }

  // ── hreflang ──────────────────────────────────────────────────────────────
  const alts = root.querySelectorAll('link[rel="alternate"][hreflang]');
  const hreflangs = alts.map((a) => ({
    lang: (a.getAttribute('hreflang') || '').trim(),
    href: (a.getAttribute('href') || '').trim(),
  }));
  // SSR entity/route pages are multilingual and must advertise alternates.
  checks.push(check('hreflang-present', isSsr ? SEVERITY.WARN : SEVERITY.INFO, hreflangs.length > 0, `${hreflangs.length} alternates`));
  if (hreflangs.length > 0) {
    const allAbsolute = hreflangs.every((h) => /^https:\/\//i.test(h.href));
    checks.push(check('hreflang-absolute', SEVERITY.WARN, allAbsolute, allAbsolute ? 'all absolute' : 'some relative/empty'));
    const noEmptyLang = hreflangs.every((h) => h.lang.length > 0);
    checks.push(check('hreflang-lang-codes', SEVERITY.WARN, noEmptyLang, noEmptyLang ? 'all tagged' : 'empty hreflang value'));
  }

  // ── H1 ────────────────────────────────────────────────────────────────────
  const h1s = root.querySelectorAll('h1');
  const h1Text = h1s.map((h) => h.text.trim()).filter(Boolean);
  checks.push(check('h1-present', errLevel, h1Text.length >= 1, h1Text.length ? `“${h1Text[0].slice(0, 60)}”` : 'no non-empty H1'));
  // Multiple H1s is a warning (valid in HTML5 outline but usually unintended).
  checks.push(check('h1-single', SEVERITY.WARN, h1s.length <= 1, `${h1s.length} H1 tags`));

  // ── main content ───────────────────────────────────────────────────────────
  const body = root.querySelector('body') || root;
  const contentChars = (body.structuredText || body.text || '').replace(/\s+/g, ' ').trim().length;
  checks.push(check(
    'main-content',
    isSsr ? SEVERITY.ERROR : SEVERITY.INFO,
    isSsr ? contentChars >= SSR_MIN_CONTENT_CHARS : contentChars > 0,
    `${contentChars} visible chars`,
  ));

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const jsonld = collectJsonLd(root);
  const badJsonLd = jsonld.filter((j) => !j.ok);
  checks.push(check('jsonld-present', isSsr ? SEVERITY.WARN : SEVERITY.INFO, jsonld.length > 0, `${jsonld.length} blocks`));
  // A malformed JSON-LD block IS an error — it silently drops structured data.
  checks.push(check('jsonld-valid', jsonld.length ? SEVERITY.ERROR : SEVERITY.INFO, badJsonLd.length === 0, badJsonLd.length ? `${badJsonLd.length} invalid: ${badJsonLd[0].error}` : 'all valid'));

  // ── internal links ───────────────────────────────────────────────────────────
  const links = countInternalLinks(root, host);
  checks.push(check(
    'internal-links',
    isSsr ? SEVERITY.WARN : SEVERITY.INFO,
    isSsr ? links >= SSR_MIN_INTERNAL_LINKS : links >= 0,
    `${links} internal links`,
  ));

  const ok = !checks.some((c) => c.level === SEVERITY.ERROR && !c.ok);
  return { url, profile, ok, checks };
}

// Summarize a batch of evaluatePage() results.
export function summarize(results) {
  const total = results.length;
  const failed = results.filter((r) => !r.ok);
  const errorChecks = results.reduce((n, r) => n + r.checks.filter((c) => c.level === SEVERITY.ERROR && !c.ok).length, 0);
  const warnChecks = results.reduce((n, r) => n + r.checks.filter((c) => c.level === SEVERITY.WARN && !c.ok).length, 0);
  return { total, passed: total - failed.length, failed: failed.length, errorChecks, warnChecks };
}

// One-line-per-page human report.
export function formatResults(results) {
  const lines = [];
  for (const r of results) {
    const failed = r.checks.filter((c) => !c.ok);
    const errs = failed.filter((c) => c.level === SEVERITY.ERROR);
    const warns = failed.filter((c) => c.level === SEVERITY.WARN);
    const mark = r.ok ? '✅' : '❌';
    let line = `${mark} [${r.profile}] ${r.url}`;
    if (errs.length) line += `\n     ERRORS: ${errs.map((c) => `${c.name}(${c.detail})`).join(', ')}`;
    if (warns.length) line += `\n     warn:   ${warns.map((c) => `${c.name}(${c.detail})`).join(', ')}`;
    lines.push(line);
  }
  const s = summarize(results);
  lines.push('');
  lines.push(`— ${s.passed}/${s.total} pages passed · ${s.errorChecks} error-checks · ${s.warnChecks} warn-checks`);
  return lines.join('\n');
}

export { SEVERITY, SSR_MIN_BYTES, SSR_MIN_CONTENT_CHARS, SSR_MIN_INTERNAL_LINKS };
