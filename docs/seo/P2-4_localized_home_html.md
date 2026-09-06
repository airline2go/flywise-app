# P2-4 — Localize homepage raw HTML for all 8 languages

**Scope:** P2-4 only. No URL changes, no production data touched, nothing outside
this fix (no indexability policy / 182 routes / SEO_EVIDENCE_POLICY_ENFORCED /
sitemap / redirects / blog / finance / booking / Duffel / Stripe / schema).

## Problem
The customer home is one verbatim `public/index.html` served under every language
prefix via `next.config.mjs` rewrites. The head was localized only by
`canonical-fix.js` and the **body** only by `app.js` `applyTranslations()` — both
client-side. So the raw HTML Googlebot parses first was **entirely German** and
canonicalised `/en` (etc.) to the **German root**. A crawler could treat every
localized home as a duplicate of `/` before JS ran.

## Fix — reuse the existing i18n system at build time
`scripts/prerender-localized-homes.mjs` runs **last** in `build` (after
`stamp-assets`) and writes one fully-localized `public/<lang>.html` per language,
derived from the popular-routes-injected + asset-stamped `index.html`:

- **Head** localized (mirrors `canonical-fix.js` `HOME_META`): `<html lang>`,
  `<title>`, `meta description`, `og:title/description/locale/url`,
  `twitter:title/description/url`, and a **self** canonical.
- **Body** localized by **re-using `app.js`'s own `TRANSLATIONS` dictionary**
  (extracted from `public/app.js` — no parallel i18n system) and applying the
  exact same rule `applyTranslations()` uses: every `[data-i18n]` element's inner
  text = the translation; every `[data-i18n-placeholder]`'s `placeholder` = the
  translation. This localizes the H1, hero pill/subtitle, tabs, nav, search-form
  labels, chips and footer nav in the first byte.

Body edits are done by **byte-range splicing** (via `node-html-parser` element
ranges) — nothing is reserialized, so the CSP-hashed inline `<head>` scripts, the
inline SVG flags, and every non-i18n byte stay identical (verified).

### German: `/` and `/de`
Per decision: `/de` is now a **distinct self-canonical German page**
(`canonical https://airpiv.com/de`), while the bare root `/` still serves
`index.html` verbatim (`canonical https://airpiv.com/`). The `hreflang` cluster's
`de` alternate is updated from `/` → `/de` on every page (one-line change);
`x-default` stays on the root. So `/` = generic x-default, `/de` = explicit German.

## Files changed
| File | Change |
|---|---|
| `web/lib/home-i18n.mjs` | `HOME_LANGS` (8, incl. `de`), `HOME_META` (+de), `extractTranslations()` (string-aware brace match of `TRANSLATIONS`), `translate()` (lang→de→key, same as app.js), `localizeHead`, `fixHreflangCluster` (de→/de, idempotent), `localizeBody` (range-splice), `localizeHomeHtml`. |
| `web/scripts/prerender-localized-homes.mjs` | Extract dict, generate + **self-verify** all 8 files; **FAIL the build (exit 1)** if the dict is missing, a language is untranslated (sentinel-key check vs German), or a file fails its check. No German fallback. |
| `web/next.config.mjs` | `LANG_HOMES` adds `de`; each `/<lang>` → `/<lang>.html`; root `/` → `/index.html` unchanged. |
| `web/public/index.html` | Single line: `hreflang="de"` → `https://airpiv.com/de`. |
| `web/public/canonical-fix.js` | `/de` (and the 7) self-canonical to `/<seg>`; only the bare root is canonical `/`. Safety-net now agrees with the raw HTML. |
| `web/.gitignore` | Ignore the 8 generated `public/<lang>.html` build artifacts. |
| `web/test/home-i18n.test.mjs` | 11 tests (below). |

## Tests
- **P2-4 tests: 11/11 pass.** Cover, for all 8 languages: correct `<html lang>`,
  self-canonical, localized title/description/OG/Twitter, localized H1 + hero sub
  + nav + placeholder (body), textContent-replacement of nested children (matches
  `applyTranslations`), CSP+inline-script+SVG byte-identity, `/de` German page,
  hreflang cluster (de→/de, x-default→/), idempotent hreflang fix, no German
  metadata leak, no interior-URL rewrites, `extractTranslations` + `translate`
  fallbacks, escapers, `HOME_META` completeness.
- **Full frontend suite: 434/434 pass.**
- **Production build: success** — `[prerender-localized-homes] wrote + verified
  8/8 localized home files: en, ar, es, fr, it, nl, tr, de`; each file carries the
  stamped `app.js?v=…` and the injected popular-routes cards (correct build order).

## Raw-HTML proof (samples)
- `/en`: `<html lang="en">`, `<title>Airpiv | Book cheap flights &amp; compare
  airfares</title>`, `canonical https://airpiv.com/en`, H1 `Search cheap flights
  / and compare / worldwide`, `placeholder="From — city or airport"`.
- `/ar`: `<html lang="ar">`, Arabic title, `canonical https://airpiv.com/ar`, H1
  `ابحث وقارن الرحلات`.
- `/de`: `<html lang="de">`, German title, `canonical https://airpiv.com/de`, H1
  `Günstige Flüge suchen`.
- All pages: `hreflang="de" → /de`, `hreflang="x-default" → /`.

## Known limitations
- The secondary **"Beliebte Flugstrecken" (popular routes)** section heading and
  its build-injected route cards have **no `data-i18n` key**, so they remain
  German in every language — **exactly as they already are client-side** (app.js
  can't translate keys that don't exist). This is a pre-existing gap, not a
  regression, and localizing it is out of P2-4 scope (it needs new dictionary
  keys). Flagged for a follow-up if desired.
- `dir` is left LTR for all languages (matches `canonical-fix.js`), preserving the
  home's verified visual parity; `lang` is the SEO-relevant signal.

## Rollback
Revert `next.config.mjs` (`/<lang>` → `/index.html`, drop `de`), the `index.html`
hreflang line, `canonical-fix.js`, and drop the script from `build`. No data/URL
migration to undo.
