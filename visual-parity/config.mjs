// [VISUAL-PARITY-CONFIG] The single source of truth for what gets compared.
//
// Two "targets" are screenshotted and diffed against each other:
//   - legacy    → the current production frontend (plain HTML/CSS/JS),
//                 served straight from the flywise-app repo root.
//   - candidate → the Next.js migration (flywise-app/web), served by
//                 `next start` / `next dev`.
//
// Parity is proven per (page × viewport × language). A page passes only
// when its diff pixel count is <= `maxDiffPixels` (0 by default: exact).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..'); // flywise-app/

// ─── Targets ────────────────────────────────────────────────────────────
// `base` is filled in at runtime once each target's server is up. `docRoot`
// (legacy only) is the directory the static server serves.
export const TARGETS = {
  legacy: {
    kind: 'static',
    docRoot: REPO_ROOT,
    // Legacy pages are physical .html files; a clean URL like /about maps
    // to /about.html. mapUrl() below encodes that so the page list can use
    // production-shaped paths.
    port: 4310,
  },
  candidate: {
    kind: 'external',
    // Point this at a running Next.js server (npm run start in web/).
    // Overridable with CANDIDATE_BASE=http://host:port.
    base: process.env.CANDIDATE_BASE || 'http://localhost:3000',
  },
};

// ─── Viewports ──────────────────────────────────────────────────────────
// One representative width per breakpoint. Heights are the initial viewport;
// full-page capture extends past them.
export const VIEWPORTS = [
  { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 1 },
  { id: 'tablet', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];

// ─── Languages ──────────────────────────────────────────────────────────
// German is the default (unprefixed root); the other six live under /xx/.
// `legacyFile` lets a legacy page whose translation is a *separate file*
// (e.g. about-en.html) override the default de→root / xx→prefix mapping.
export const DEFAULT_LANGUAGE = 'de';
export const LANGUAGES = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl'];
export const RTL_LANGUAGES = new Set(['ar']);

// ─── Pages under test ────────────────────────────────────────────────────
// Start with the deterministic, backend-free pages (these prove the harness
// end-to-end). Dynamic/live-data pages (search results, booking, checkout)
// get added once we can pin their data with fixtures — see README "Dynamic
// pages". `langs` defaults to ['de'] when a page has no localized variants.
//
//   legacy    : how the URL maps onto the legacy static site
//   candidate : how the same page is addressed on the Next.js site
// Real public URLs keep the .html suffix (see sitemap-pages.xml); the
// static content pages are served byte-identical from the Next.js public/
// dir at those exact URLs, so legacy and candidate paths are the same.
// `home` is the one already reimplemented as an RSC/component page, so its
// candidate path is the app-router root '/' — this row measures that gap.
export const PAGES = [
  // The homepage is served verbatim from index.html and localizes itself
  // from the URL path (app.js: '/en' -> English, '/ar' -> Arabic, …), so all
  // 7 languages are tested — including Arabic RTL. legacyByLang points each
  // localized home at its own URL; the harness's static server + the Next.js
  // rewrites both serve index.html there.
  {
    id: 'home',
    legacy: '/index.html',
    candidate: '/',
    langs: ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl'],
    legacyByLang: { en: '/en', ar: '/ar', es: '/es', fr: '/fr', it: '/it', nl: '/nl' },
    fullPage: true,
  },
  { id: 'about', legacy: '/about.html', candidate: '/about.html', langs: ['de'], fullPage: true },
  { id: 'contact', legacy: '/contact.html', candidate: '/contact.html', langs: ['de'], fullPage: true },
  { id: 'privacy', legacy: '/privacy.html', candidate: '/privacy.html', langs: ['de'], fullPage: true },
  { id: 'terms', legacy: '/terms.html', candidate: '/terms.html', langs: ['de'], fullPage: true },
  { id: 'blog-index', legacy: '/blog.html', candidate: '/blog.html', langs: ['de'], fullPage: true },
  { id: 'not-found', legacy: '/404.html', candidate: '/404.html', langs: ['de'], fullPage: true },
];

// The default per-page acceptance threshold: 0 diff pixels = truly identical.
// A page may override with its own `maxDiffPixels` when a genuinely
// unavoidable difference (e.g. an <iframe> third-party widget) is signed off.
export const DEFAULT_MAX_DIFF_PIXELS = 0;

// pixelmatch per-pixel colour tolerance. Kept strict; raise only with a
// documented reason.
export const PIXELMATCH_THRESHOLD = 0.1;
