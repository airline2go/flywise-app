# Airpiv — Phase 0 SEO Baseline & Audit

**Date:** 2026-09-03
**Scope:** Code-based audit of the SEO/indexing/data-integrity architecture in
`flywise-app/web` (the Next.js app that renders every SEO entity page), plus
real Google Search Console *performance* + *sitemap* data pulled live for
`sc-domain:airpiv.com`.

**Rule for this document:** every finding carries an evidence tag. Nothing
stronger than the available evidence is claimed. No metric is invented.

| Tag | Meaning |
|-----|---------|
| `[CODE-PROVEN]` | Proven directly from source in this repo |
| `[DATA-PROVEN]` | Proven from real data available to this session (GSC performance/sitemap API) |
| `[GSC-COVERAGE-REQUIRED]` | Needs the GSC Index-Coverage / URL-Inspection report (not exposed by the connector API used here) |
| `[LOGS-REQUIRED]` | Needs server/Vercel logs |
| `[CRAWLER-REQUIRED]` | Needs a real production crawl |
| `[CWV-REQUIRED]` | Needs Lighthouse / PageSpeed / CrUX field data |

---

## 1. Executive Summary

The system is **not** a greenfield with broken fundamentals. The SEO
architecture is mature: a single content API, verbatim server-side renderers,
a dynamic sharded sitemap index, correct hreflang + `x-default`, a single
canonical host (`https://airpiv.com`, `www`→apex 301), edge bot-gating, real
404s (not soft-200s), and a build-time route-consistency guard. Most of the
"P0" items in the master spec were already implemented by prior work.

The **one confirmed architectural inconsistency** found in code is the price
source split on route pages: the `<title>`/meta description read
`cached_price` while the hero fallback and JSON-LD `Offer` read `price_min` —
so a SERP snippet could advertise a different "from" price than the page and
its structured data show. This is fixed in Phase 1 (see
`PHASE-1-CANONICAL-PRICE-SOURCE.md`).

**Real GSC signal (last 28 days, `[DATA-PROVEN]`):** 22 clicks · 14,368
impressions · CTR 0.15% · avg position ≈ 20.0. Sitemap index reports **20,625
URLs submitted, 0 errors, 1 warning**. The gap between 20.6k submitted URLs and
the impression profile (impressions concentrated on `flights/*` route pages;
`city`/`airport`/`airline` pages near-invisible) is consistent with a large
"submitted but not yet indexed / ranked on page 2" long tail — but the exact
indexed/discovered/excluded counts are **`[GSC-COVERAGE-REQUIRED]`** and are
deliberately not stated here.

**This is not evidence of a penalty.** No Manual Action data was inspected. Avg
position ≈ 20 with low CTR is an ordinary "ranked on page 2" pattern, not a
demotion signal (Phase 55).

---

## 2. Architecture Inventory (0.1)

| Concern | File(s) | Responsibility | Data source | Consumers |
|---|---|---|---|---|
| Framework | `web/` | Next.js 16.2.10, React 19, App Router | — | — |
| Route pages (SSR) | `app/[lang]/flights/[slug]/route.js`, `app/(de)/flights/[slug]/route.js` | GET handler → HTML string | `renderFlightRouteHtml` | Googlebot/users |
| Render orchestration | `lib/legacy-render/render.js` | Fetch data, compute related/city links, call generators | `content-api` | route.js handlers |
| Entity generators | `lib/legacy-render/render-{flight-route,city,country,airport,airline,blog-post,sitemap,popular}.js` | Build full HTML doc + JSON-LD (CommonJS, verbatim from `build/`) | route object | render.js |
| Content API | `lib/content-api.js` | Fetch cities/countries/airports/airlines/routes/blog from backend, request-cached | flywise-server REST | all renderers, sitemaps |
| Canonical/host | `next.config.mjs` | `www`→apex 301; http→https at edge (Vercel) | — | all responses |
| Rewrites | `next.config.mjs` | `/`, `/en`…`/tr`, `/search/:pair` → static `index.html` (verbatim SPA) | `public/index.html` + `app.js` | home + search |
| SSR shell | `lib/legacy-render/shell.js` | `<head>`: title, meta, canonical, hreflang, robots, OG, Org JSON-LD | render params | all entity pages |
| ISR/cache | per-route `export const revalidate` (route=86400, sitemap.xml=3600) + `content-api` request cache | Revalidation windows | — | — |
| Price refresh (live) | `buildLiveScript` in `render-flight-route.js` → `api.airpiv.com/route-price` | Client-side live price enhancement | flywise-server + Duffel/Redis | hero box only |
| Canonical price (static) | `resolveCanonicalPrice` in `render-flight-route.js` (Phase 1) | ONE "from" price for title/meta/hero-fallback/Offer | persisted `price_min`/`cached_price` | 4 surfaces |
| Sitemap | `app/sitemap.xml/route.js` + `lib/sitemap-urls.js`, `lib/sitemap-route.js`, `lib/sitemap-serialize.mjs` | Dynamic sharded index; per-type child sitemaps | `content-api` lists | Google |
| robots.txt | `public/robots.txt` (static) | Advisory allow/deny + sitemap decl | — | crawlers |
| Edge bot-gate | `middleware.js` | 403 for scraper UAs; admin block | UA string | all requests |
| hreflang | `shell.js` (`urlsFor` in `languages.js`) | self + all-lang alternates + `x-default` | route slug | `<head>` |
| Multilingual routing | `languages.js` (`de` default unprefixed; `en/ar/es/fr/it/nl/tr` prefixed) | URL ↔ language | — | routes, sitemap |
| Internal linking | `related-routes.js`, `render.js` (city links, related articles), breadcrumbs in generators | Route↔city↔related graph | `content-api` | pages, ItemList JSON-LD |
| 404/410 | `lib/legacy-render/serve.js` (`htmlResponse(null)` → real 404) | Missing entity → 404 | — | route.js handlers |

---

## 3. Route Types (0.2)

| Type | URL pattern (de default / prefixed) | Render | Canonical | Indexable | In sitemap |
|---|---|---|---|---|---|
| Home / SPA | `/`, `/en`…`/tr`, `/search/:pair` | Static `index.html` (rewrite) | self | yes | pages |
| Route page | `/flights/{slug}`, `/{lang}/flights/{slug}` | SSR (ISR 24h) | self | yes, unless thin-content (noindex,follow) | routes |
| City | `/city/{slug}`, `/{lang}/city/{slug}` | SSR | self | yes | cities |
| Country | `/country/{code}`, `/{lang}/…` | SSR | self | yes | countries |
| Airport | `/airport/{code}`, `/{lang}/…` | SSR | self | yes | airports |
| Airline | `/airline/{code}`, `/{lang}/…` | SSR | self | yes | airlines |
| Blog | `/blog/{slug}`, `/{lang}/blog/{slug}` | SSR (de source + translations) | self | yes | blog |
| HTML sitemap hub | `/sitemap`, `/{lang}/sitemap` | SSR | self | yes | — |
| Popular hub | `/popular`, `/{lang}/popular` | SSR | self | yes | popular |
| Static | `/about.html`, `/privacy.html`, … | static | self | yes | pages |
| Admin | `/admin` | app | — | blocked (robots + edge) | no |

**Duplicate-URL risk `[CODE-PROVEN]`:** `/de/*` prefixed entity URLs 404 by
design (`isPrefixedLang` excludes `de`), so the default language exists only at
the unprefixed path — no `de` duplicate. Query-parameter and trailing-slash
handling is **`[CRAWLER-REQUIRED]`** to confirm on production (no in-app
trailing-slash normalizer was found; Next.js default is `trailingSlash:false`).

---

## 4. Rendering (0.3) `[CODE-PROVEN]`

Route pages are **true SSR** — the GET handler returns a complete HTML document
containing `<title>`, meta description, canonical, hreflang, `<h1>`, breadcrumb,
intro copy, route-facts cards, price panel, airport/airline sections, FAQ (with
FAQPage JSON-LD), and internal links, all before any JavaScript runs. The only
client-side piece is the **live price box + duration insights** (`buildLiveScript`),
which is an isolated enhancement and never touches title/description/canonical/
hreflang/JSON-LD. Verifying the rendered bytes on production is
`[CRAWLER-REQUIRED]`, but the initial HTML is generated server-side by design.

---

## 5. Canonical (0.4) `[CODE-PROVEN]`

- Single canonical host pinned in `next.config.mjs` (`www`→apex literal 301).
- Every entity page emits a self-referential absolute `<link rel="canonical">`
  via `shell.js` using `urlsFor(...)[lang]`.
- Canonical, sitemap, and internal links are all built from the **same**
  `content-api` slug source (no DB≠sitemap≠canonical drift found).
- **Not changed in this PR** beyond what Phase 1's price fix requires (none).

---

## 6. Hreflang / Multi-language (0.5) `[CODE-PROVEN]`

- 8 languages: `en, de, ar, es, fr, it, nl, tr` (`languages.js`).
- `shell.js` emits an alternate for **every language that has a URL** plus a
  single `x-default` → the default (`de`) URL. Because one route handler renders
  all languages, every advertised alternate resolves to a real 200 page →
  reciprocity holds by construction.
- **Minor observation `[CODE-PROVEN]` (INFO):** when a route is `noindex` for
  thin content, it is `noindex` in *all* languages together, and hreflang still
  cross-references those noindex variants. Low-impact (Google ignores hreflang
  among noindex pages); recorded, not fixed.

---

## 7. Sitemap (0.6)

- `[CODE-PROVEN]` `/sitemap.xml` is a **dynamic index** (no page URLs itself),
  auto-sharding each type past Google's 50k/50MB limits; children per type
  (routes/cities/countries/airports/airlines/blog/pages/popular). Built from the
  same `content-api` lists the pages use → in-sync by construction. Replaces the
  old hand-maintained `public/sitemap.xml`.
- `[DATA-PROVEN]` GSC reports the index at `https://airpiv.com/sitemap.xml`:
  **submitted 20,625, errors 0, warnings 1, last downloaded 2026-09-02**.
- `[GSC-COVERAGE-REQUIRED]` how many of those 20,625 are actually indexed vs
  discovered/crawled-not-indexed is **not** exposed by the performance/sitemap
  API and is not stated here.

---

## 8. Robots (0.7) `[CODE-PROVEN]`

- `public/robots.txt`: Googlebot/Bingbot/Applebot/DuckDuckBot fully allowed;
  aggressive scrapers + AI crawlers `Disallow: /`; `*` allowed except `/admin`;
  `Sitemap:` points at the index. No CSS/JS blocked.
- `middleware.js` hard-blocks the same scraper UAs at the edge (403). Note this
  is UA-substring based (can't reverse-DNS at the edge), which is safe because
  "allow" grants no privilege.
- **Risk `[LOGS-REQUIRED]`:** confirm the edge gate never 403s real Googlebot
  (UA allow-list must stay correct); verifiable only from logs.

---

## 9. Metadata (0.13) `[CODE-PROVEN]`

- Title: natural-language, per-city-pair unique, always `… | Airpiv`, never
  contains a price value; facet words ("Prices"/"Flight Time"/"Direct") are
  data-gated. `buildRouteTitle`.
- Meta description: one localized, per-route sentence; a "from {price}" clause
  appended only when a real price exists. `buildRouteMetaDescription`.
- **Finding F-1 (fixed in Phase 1):** title facet + meta "from" price were
  sourced from `cached_price`, diverging from the hero/Offer's `price_min`.

---

## 10. JSON-LD (0.14) `[CODE-PROVEN]`

Per route page: `WebPage` (+ `speakable`), `FAQPage` (real FAQ items, matching
the visible FAQ — the historical double-write bug is already fixed), `BreadcrumbList`
(drops any city with no page so no item points at a 404), `Flight`
(data-gated `flightDistance`/`estimatedFlightDuration`), optional `Offer`
(sample-backed), and `ItemList` for related routes/articles.
- **Finding F-1** also affected the `Offer` price source — unified in Phase 1.

---

## 11. Price Architecture (0.8) `[CODE-PROVEN]`

Route price fields on the route object (from flywise-server `/route-pages/:slug`):

| Field | Meaning | Freshness | Pre-Phase-1 consumers |
|---|---|---|---|
| `cached_price` / `cached_currency` | current cached "a" price attached by server | no exposed timestamp | title facet, meta "from" clause |
| `price_min`/`price_avg`/`price_max` | persisted aggregates over `price_sample_count` recent checks | `price_updated_at` | price panel (avg/range), hero fallback `CANON_PRICE`=min, `Offer`=min |
| `price_trend` | up/down/stable | `price_updated_at` | price panel trend card |
| live price (client) | Duffel/Redis via `api.airpiv.com/route-price` | `checkedAt`, `snapshot.isLive` (server TTL) | hero box only, labelled "live" honestly |

---

## 12. RouteSnapshot / Price Consistency (0.9, 0.10) — **Finding F-1** `[CODE-PROVEN]`

- **ID:** F-1 · **Severity:** P0 (data integrity / SERP-vs-page price) · **Status:** FIXED (Phase 1)
- **Evidence:** `render-flight-route.js` — `buildRouteTitle` L~602 &
  `buildRouteMetaDescription` L~634 read `route.cached_price`; `buildLiveScript`
  `CANON_PRICE` L~474 and the `Offer` L~878 read `route.price_min`.
- **Impact:** a route with `cached_price=83` and sample-backed `price_min=60`
  advertised "from 83 €" in the SERP title/description while the hero fallback
  and the `Offer` structured data showed 60 € — the "title price ≠ page price"
  contradiction the spec forbids.
- **Fix:** single `resolveCanonicalPrice()` resolver feeds all four surfaces.
  See `PHASE-1-CANONICAL-PRICE-SOURCE.md`. **Requires production?** No.

The `price_avg` "average/typical" statistic is intentionally a *different*,
clearly-labelled value and is **not** unified with the "from" price (0.9/1.10).

---

## 13. Data Consistency (0.11) `[CODE-PROVEN]`

- Airline count: `effectiveAirlineCount()` makes the visible list length
  authoritative (count card = intro clause = FAQ), falling back to the scalar
  only when no list exists. `validateRouteConsistency()` warns (non-fatal) when
  `airline_count !== airlines.length` and when `stop_distribution` sums to 0.
- Stop distribution: nonstop/1-stop/2+ derived from one `stop_distribution`
  object; nonstop-share computed from their sum — internally consistent.
- Duration: one `formatHoursMinutes()` used for hero-derived and facts/FAQ.
- **Observation (INFO) `[CODE-PROVEN]`:** the validation *warns* but does not
  gate publication (spec Phase 13/29 ask for an error-queue / do-not-publish on
  critical failure). Recorded as **F-2 (P2)** — a future hardening, out of scope
  for the Phase-1 PR.

---

## 14. Internal Linking (0.15) `[CODE-PROVEN]`

Route pages link: breadcrumb (home→country→city→route, city dropped if pageless),
hero city links (guarded by `hasCity`), airport + alternative-airport cards,
airline cards, related routes (scored, with reasons), "more from origin / to
destination" sets, and genuinely-matched related blog posts. City-link guard
prevents 404 links and invalid BreadcrumbList items.
- **Observation (INFO):** `city` pages draw almost no impressions
  (`[DATA-PROVEN]`: 3 in 28 days) — an internal-linking/indexation opportunity,
  but diagnosing orphan status is `[CRAWLER-REQUIRED]`.

---

## 15. Error Handling (0.16) `[CODE-PROVEN]`

- Missing entity → **real HTTP 404** (`serve.js htmlResponse(null)`), not a
  soft-200. `/de/*` prefixed and unknown prefixes 404 by design.
- Redirects: `www`→apex 301 in `next.config.mjs`; http→https at the edge.
- 4xx/5xx *rates* in production are `[LOGS-REQUIRED]`.

---

## 16. Cache / ISR / SSR (0.17) `[CODE-PROVEN]`

- Route pages: `export const revalidate = 86400` (24h ISR safety net); admin
  edits refresh immediately via `/api/revalidate`. `sitemap.xml`: `revalidate=3600`
  + `stale-while-revalidate`.
- `content-api` uses request-scoped caching so lists are fetched once per render.
- The cache-miss render logs `{tag:'flight-render', event:'cache-miss', duffel:false}`
  — asserting the SSR render makes **no** live Duffel call (crawl-cost control).
- **Observation (INFO):** TTLs are per-route constants, not a single central
  policy object (spec Phase 12). No contradiction found, but a central TTL
  module would satisfy Phase 12; recorded as **F-3 (P3)**, out of scope here.

---

## 17. Programmatic-SEO / Content (0.12) `[CODE-PROVEN]`

- Thin-content routes (no distance/duration/airline/stop data and no admin
  copy) are `noindex, follow` — good scaled-content hygiene.
- Content is varied by real signals (haul tier, domestic/intl, carrier count,
  popularity) with deterministic per-slug variant selection; claims are
  data-gated. No fabricated "600+ airlines / live / stark nachgefragt" strings
  were found hard-coded in the route generator.
- Full copy-quality/duplication review across all languages is a P3 content
  pass, out of scope for this PR (spec 1.17).

---

## 18–21. GSC / Logs / Crawler / CWV Status

- **GSC performance (0.19) `[DATA-PROVEN]`, last 28d:** 22 clicks · 14,368 impr ·
  CTR 0.15% · pos ≈ 20.0. By page type (impressions): `flights` 6,016; `fr` 2,365;
  `it` 2,049; `en` 1,490; `es` 926; `nl` 828; `tr` 431; `ar` 183; `blog` 172;
  `airline` 70; `airport` 56; `city` 3. (Language-prefix buckets aggregate that
  language's entity pages, predominantly route pages.)
- **GSC coverage/indexing (0.19):** `[GSC-COVERAGE-REQUIRED]` — indexed /
  discovered-not-indexed / crawled-not-indexed / duplicate / Google-chosen-canonical
  counts are not exposed by the performance+sitemap API used here. **Not stated.**
- **Server/Vercel logs (0.20):** `[LOGS-REQUIRED]` — PENDING. No log access this session.
- **Real crawler (0.21):** `[CRAWLER-REQUIRED]` — PENDING.
- **CWV (0.22):** `[CWV-REQUIRED]` — PENDING. Code-level notes only: hero LCP CSS
  is inlined; live price is deferred/isolated; SSR HTML carries the content.

---

## 22. Findings Register

| ID | Sev | Status | Area | Evidence | Requires prod? |
|----|-----|--------|------|----------|----------------|
| F-1 | P0 | **FIXED (Phase 1)** | Price source split (title/meta vs hero/Offer) | `[CODE-PROVEN]` render-flight-route.js | No |
| F-2 | P2 | OPEN | `validateRouteConsistency` warns but doesn't gate publish | `[CODE-PROVEN]` | No |
| F-3 | P3 | OPEN | No single central TTL policy module | `[CODE-PROVEN]` | No |
| F-4 | P2 | OPEN | Pre-existing test failure: `sitemap-sharding` expects 8 canonical static pages, gets 10 | `[CODE-PROVEN]` (fails on clean branch) | No |
| F-5 | P2 | OPEN | Pre-existing test failure: `seo-analyze.test.mjs` | `[CODE-PROVEN]` (fails on clean branch) | No |
| F-6 | INFO | OPEN | hreflang cross-refs noindex variants for thin routes | `[CODE-PROVEN]` | No |
| F-7 | INFO | OPEN | `city` pages near-zero impressions (3/28d) — indexation/linking opportunity | `[DATA-PROVEN]` + `[CRAWLER-REQUIRED]` to diagnose | Partly |

---

## 23. Risks

- Changing customer-facing price/SERP copy is high-blast-radius; Phase 1 is
  kept minimal and fully test-guarded, and preserves existing behavior wherever
  `price_min` was already the source.
- The 20.6k-vs-impressions gap is expected for a large programmatic site but its
  *cause* (not-indexed vs page-2-ranked) cannot be split without coverage data.

## 24. Pending Production Checks

GSC Index Coverage export / URL Inspection; server logs (Googlebot codes, 4xx/5xx,
cold renders, cache hit ratio); a real Googlebot-emulating crawl (status/canonical/
hreflang/duplicate titles/orphans); CWV field data (LCP/INP/CLS mobile+desktop).

## 25. Recommended Priorities (evidence-ordered)

1. **F-1 price unification** — DONE (Phase 1).
2. Pull GSC Index-Coverage export → quantify the not-indexed long tail (P0 diagnostic).
3. F-4/F-5 pre-existing test failures — fix in a dedicated PR (P2).
4. F-2 publication gating + F-3 central TTL — architecture hardening (P2/P3).
5. City-page indexation/linking investigation (F-7) once crawl data exists (P2).
6. CWV field data pass (P2, needs data).
