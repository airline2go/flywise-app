# P0-5 (blog listings) · P0-6 (blog hreflang) · P0-7 (blog revalidation)

**Date:** 2026-09-05 · **DB:** `flyise` / `tflpaysskecpmdpwbvog`

## Blog content reality (live production)
| Language | Published posts |
|---|---|
| de (source) | **14** |
| it | **1** |
| en, ar, es, fr, nl, tr | **0** |

This drives every decision below: only German (and marginally Italian) has real blog content. Creating `/en/blog` etc. would be empty pages → forbidden by your rules.

## P0-7 — revalidation no longer collapses non-English to German ✅
`revalidate-paths.mjs` had `entity.lang === 'en' ? 'en' : 'de'` — any ar/es/fr/it/nl/tr blog revalidation went to `/de/`. **Fixed:** validate `entity.lang` against the canonical language set and use it directly; only a truly unknown/missing lang falls back to German (the source/root). Tests assert each of the 8 languages revalidates its own path. Also aligned the test fixture to the full **8-language** set (touches P0-10).

## P0-6 — blog hreflang from real published siblings ✅
`blog-hreflang.js` only understood de/en via `slug_en`; it ignored `blog_post_translations` (up to 8 languages) and couldn't emit correct alternates.
**Fixed (both repos):**
- Backend `/blog-posts/:slug` now returns `post.alternates = [{language, slug}]` built from `post_id`: the German source + every language with a real published translation + legacy inline English (`slug_en`) when set. A language is never listed without a real slug.
- Frontend builds hreflang from `post.alternates` for **all** languages (no de/en special-casing). Each entry uses its own per-language slug → reciprocal, never a 404. `x-default` is derived by `renderShell` from the German entry (stable approved default, never the current language). Falls back to self-only if the backend payload lacks alternates.
- Tests: German-only, de+en, de+ar+en, all-8, missing-slug dropped, x-default→de.

## P0-5 — blog listing routes ⚠️ partial (safe fix done; one decision needed)
**Done now (safe, no URL change):** `public/blog.html` advertised `hreflang en → /en/blog`, but **no `/en/blog` route exists and there are 0 English posts** — a broken alternate pointing at a 404. Removed it; the German listing now advertises only itself + x-default.

**Still needs your decision (architectural / URL-sensitive):**
The German blog listing lives at the static `public/blog.html`, whose article links are injected **client-side** (raw HTML ships an empty `ItemList` — P2-5). A proper P0-5 fix is a **server-rendered listing with crawlable `<a>` links** at a clean route. But that conflicts with rule #1 (don't change existing URLs): `/blog.html` is the already-indexed German listing URL.

Options (I recommend **A**):
- **A.** Add a server-rendered `/blog` (German) listing with crawlable links + populated ItemList, and `301 /blog.html → /blog` (persistent, via the P0-4 mechanism). One clean canonical; old URL preserved via redirect. For Italian (1 post) optionally add `/it/blog`. No empty listings for the other 6.
- **B.** Keep `/blog.html` as the canonical German listing URL but make its links crawlable via a build-time render step (no URL change, no new route).
- **C.** Leave as-is for now (only the broken-hreflang fix ships).

I did **not** guess between these because they change canonical/URL behavior. Tell me A/B/C.

## Tests / CI
- Backend: `content.routes` + `blogTranslation` = 35 pass. `npm ci` clean.
- App: full suite **394** pass. `npm ci` clean.

## Rollback
All pure code + one additive backend response field. Revert commits to restore prior behavior. No migration, no data change, no URL change (the blog.html edit only removes a broken alternate).
