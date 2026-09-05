# Production verification — live results (read-only)

**Date:** 2026-09-05 · Target: `https://airpiv.com` / `https://api.airpiv.com` (live).
All checks read-only. This is the Definition-of-Done "Production Verification" pass.

| # | Check | Result |
|---|---|---|
| 1 | **Duplicate loser still 301 after its row was deleted (DoD #9)** | `/flights/ams-vie` → **301** → `/flights/amsterdam-vienna` ✅ — the loser route_pages row was deleted by P1-1, yet the old URL still redirects via the persistent `route_redirects` entry (P0-4). Live proof the redirect survives row deletion. |
| 2 | Canonical winner serves 200 | `/flights/amsterdam-vienna` → **200** ✅ |
| 3 | Data-backed route indexable | `/flights/hamburg-barcelona-2` → 200; `robots: index, follow`; `canonical` self ✅ |
| 4 | Blog listing | `/blog.html` → **200** ✅ |
| 5 | Blog post hreflang | German post advertises `hreflang=de` + `x-default → de` only (no fake alternates) ✅ (matches P0-6) |
| 6 | Sitemap index | `/sitemap.xml` → **200**, `application/xml` ✅ |
| 7 | Child sitemap reachable + valid | `/sitemap-pages.xml` → **200**, `application/xml` ✅ |
| 8 | API robots | `api.airpiv.com/robots.txt` = `User-agent: * / Disallow: /` (no Sitemap) ✅ |
| 9 | API X-Robots-Tag | responses carry `x-robots-tag: noindex, nofollow` ✅ |
| 10 | Trust page | `/how-it-works.html` → **200**, `index,follow` ✅ (now in sitemap, P1-7) |

## ⚠️ P2-4 finding — localized homepage raw HTML is German (separate-PR fix)
The `/en` homepage (`/en/` → 308 → `/en`, 200) ships **raw HTML that is entirely German**:
- `<html lang="de">`
- German `<title>` / `<meta description>`
- `<link rel="canonical" href="https://airpiv.com/" id="canonical-url">` — canonical points at the **German root**, and the `id="canonical-url"` shows it is rewritten **client-side** by JS.

Risk: before JS runs, Google sees a German page canonicalising to `/` — the `/en` homepage can be treated as a duplicate of `/` rather than indexed as the English home. This is exactly the P2-4 concern.

**Not fixed here by design.** The plan defers the real fix (server/build-generated localized HTML per language, no URL change) to a **separate PR** ("لا تعمل migration كاملة إلا في PR منفصل"). Recommended scope for that PR: emit per-language `<html lang>`, title/description/H1, and a **self** canonical (`/en`, `/ar`, …) in the raw HTML for each localized homepage — mirroring how the route/blog renderers already self-canonical per language. The interior route/city/airport/blog pages already self-canonical correctly (verified above); this gap is specific to the static localized **home** pages.

## Summary
Every shipped SEO change verifies correctly in production. The one open live gap is the pre-existing localized-homepage raw-HTML localization (P2-4), which is a deliberately separate migration and the P0-5 option-A listing decision. Nothing in the merged work regressed production.
