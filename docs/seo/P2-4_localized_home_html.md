# P2-4 — Build-time localized homepage HTML (self-canonical per language)

**Scope:** safe, local, in-SEO-scope. **No URL changes. No production data touched.**
The 182-route indexability flip stays deferred to the last stage (after backfill data).

## Problem (the P2-4 finding, verified live)
The customer home is one verbatim `public/index.html` served under every language
prefix (`/en`, `/ar`, …) via `next.config.mjs` rewrites. Localization of the
`<head>` happened **client-side only** (`public/canonical-fix.js`), so the **raw
HTML** Googlebot parses first was:
- `<html lang="de">` for every language,
- German `<title>` / `<meta description>` / OG tags,
- `<link rel="canonical" href="https://airpiv.com/">` — canonical pointing at the
  **German root** (rewritten to self only after JS runs).

Risk: before JS runs a crawler sees a German page canonicalising to `/`, so `/en`
(and the other six) can be treated as duplicates of `/` instead of indexed as
their own language — contradicting the `hreflang` cluster that claims each is a
distinct self-referencing page.

## Fix
Generate a build-time `public/<lang>.html` for each of the 7 prefixed languages,
with a **self** canonical and correct `lang`/title/description/OG/Twitter in the
**first byte**; point each `/<lang>` rewrite at its own file.

| File | Change |
|---|---|
| `web/lib/home-i18n.mjs` (new) | Single source of truth: `HOME_LANGS`, `HOME_META` (title/description/og:locale per language, byte-compatible with `canonical-fix.js`), and the pure `localizeHomeHtml(html, lang)` transform. |
| `web/scripts/prerender-localized-homes.mjs` (new) | Runs LAST in the build (after `stamp-assets`, so it inherits the popular-routes injection + stamped asset URLs), derives each `public/<lang>.html` from `index.html`. Defensive: per-language failure writes a verbatim German copy so the rewrite target always exists; script always exits 0. |
| `web/next.config.mjs` | Rewrite `/<lang>` → `/<lang>.html` (was `/index.html`). German root unchanged (`/` → `/index.html`). Browser URL still masked to `/<lang>`. |
| `web/package.json` | Added the script to the `build` chain. |
| `web/.gitignore` | Ignore the 7 generated `public/<lang>.html` (build artifacts, not source). |
| `web/test/home-i18n.test.mjs` (new) | 4 tests: self-canonical + localized head, canonical never at German root for any language, attribute escaping, unknown-language throws. |

## What is deliberately unchanged
- **URLs**: `/en`, `/ar`, … stay identical (rewrite masks the path).
- **`dir`**: left LTR for all (matches `canonical-fix.js`), preserving the verified
  0px visual parity of the home.
- **`hreflang` cluster**: identical self-referencing set on every page (correct).
- **`canonical-fix.js`**: kept as a redundant client-side safety net; it now
  re-applies identical values, so there is no visible flip.
- **German root** (`/`) keeps serving `public/index.html` verbatim.

## Verification (local)
- `localizeHomeHtml` unit tests: 4/4 pass.
- Full frontend suite: **427/427 pass**.
- Ran the real script against production `index.html`: 7/7 files written; each has
  `<html lang="<lang>">`, self canonical `https://airpiv.com/<lang>`, localized
  title/description/`og:url`/`og:locale`/`twitter:url`.
- **Body parity**: `diff` from `</head>` onward between `index.html` and `en.html`
  is empty — the SPA body is byte-identical.

## Rollback
Revert `next.config.mjs` rewrites to `/<lang> → /index.html` and drop the script
from `build`. No data or URL migration to undo.
