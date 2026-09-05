# P0-8 (German manual-content leak) · P0-10 (language source of truth)

**Date:** 2026-09-05

## P0-8 — German manual content no longer leaks to other languages ✅
`custom_title`, `custom_meta_description`, `intro_text`, `custom_faq` on `route_pages` are single-language (German source), but `render-flight-route.js` applied them on **all** languages (`[ADMIN-OVERRIDE-ALL-LANGS]`) — German copy would appear on `/en`, `/ar`, `/fr`, …

**Fixed:** a manual override wins **only on the German page** (`lang === DEFAULT_LANGUAGE`). Every other language uses the language-matched SEO-engine output (`gen`, already gated by `seo_lang === lang`) or the localized data-driven default. Applies to title, meta description, intro, and FAQ (both in `buildFaqItems` and the main render).

- **Live impact today:** 0 routes currently have any manual content (`custom_title`/`custom_meta_description`/`intro_text`/`custom_faq` all 0 in production) — this is a **preventive correctness fix** that stops the leak the moment an admin adds German copy.
- **Tests:** `route-manual-content-leak.test.mjs` — German page shows all 4 fields; `en/ar/fr/it/tr` show none.
- Note/follow-up: restore all-language overrides once real **per-language content fields** exist (P2-6 staged).

## P0-10 — one canonical language set (8), no silent 7-vs-8 drift ✅
Canonical set is **8**: `en, de, ar, es, fr, it, nl, tr` (`lib/languages.js` + `lib/legacy-render/languages.js`, ESM/CJS mirrors, both already 8 entries — stale "7 languages" comments corrected).

Fixed the modules that had silently drifted to 7 (missing `tr`):
- `lib/social/generator.js` and `lib/social/image-card.js` had hardcoded 7-language arrays. Replaced with a set **derived from the copy/labels that actually exist**, so:
  - it can never drift from the dictionaries again, and
  - a language is only "supported" when real human-authored copy exists for it — no English text mislabeled as another language, and **no AI-translation to fill gaps** (P2-6). Turkish is intentionally excluded from social output until real `tr` copy/labels are added, and this is documented in code.
- Test fixture in `revalidate-paths.test.mjs` aligned to the full 8 languages (done in the P0-7 change).

## Tests / CI
- Full app suite **400** pass. `npm ci` clean.

## Rollback
Pure code; revert commit. No migration, no data change, no URL change.
