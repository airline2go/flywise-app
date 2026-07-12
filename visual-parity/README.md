# Airpiv Visual Parity Harness

The referee for the Next.js migration. It screenshots the **legacy** frontend
and the **candidate** (Next.js) frontend at mobile/tablet/desktop in every
language, then diffs them **pixel by pixel**. A page is only "migrated" when
its diff is **0 pixels** — parity becomes a measured number, not an opinion.

This is why we can promise 1:1: the migration strategy is to reuse the exact
original HTML/CSS/JS, and this harness proves, per page, that nothing drifted.

## Install (once)

```bash
cd visual-parity
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

Chromium is already present in this environment (`/opt/pw-browsers`), so the
browser download is skipped.

## Use

```bash
# 1. Baseline: screenshot the legacy site (served automatically from the repo root)
node capture.mjs --target=legacy

# 2. Candidate: start the Next.js site first, then screenshot it
#    (in another shell)  cd ../web && npm run build && npm run start
CANDIDATE_BASE=http://localhost:3000 node capture.mjs --target=candidate

# 3. Diff and report
node compare.mjs
```

Or all three at once (candidate server must already be up):

```bash
node run.mjs
```

## Output

- `shots/legacy/*.png`, `shots/candidate/*.png` — raw screenshots
- `shots/diff/*.png` — red-highlighted difference maps
- `shots/report.html` — side-by-side (legacy | candidate | diff) with pass/fail
- `shots/report.json` — machine-readable results (for CI gating)

`compare.mjs` exits non-zero if **any** page has a regression or a missing
candidate screenshot, so it can gate a migration PR in CI.

## Adding pages

Edit `PAGES` in `config.mjs`. Each entry declares how the page is addressed on
the legacy site vs. the Next.js site, which languages to test, and (optionally)
a per-page `maxDiffPixels` budget for a signed-off unavoidable difference.

## Determinism

Screenshots are made reproducible (see `lib/capture.mjs`): time-based
animations/transitions are frozen, scrollbars hidden, web fonts awaited, and
nondeterministic hosts (analytics, the live-price API, chat widget, dynamic QR
images) are blocked — identically for both targets, so a real regression still
shows up while flaky network noise does not.

### Dynamic pages

Pages that render **live** data (search results, booking, checkout) are not yet
in `PAGES`: their content changes every run, so a raw diff is meaningless until
their data is pinned with fixtures / a mock backend. Add those once the fixture
layer exists; the static shell, content pages, and forms-in-a-known-state are
fully comparable today.

## Structure check (DOM / SEO parity)

`structure-check.mjs` is the second checker. Where the pixel harness needs a
rendered page (and therefore live data), this one compares the **raw HTML two
pages serve** — exactly what a crawler sees — so it works on the SEO entity
pages (city / airport / country / airline / flights / blog) directly against
production. It scores each facet and **names every difference**:

```
Page: /city/berlin
✅ Text: 100%
✅ Links: 100%
✅ Images: 100%
✅ Structured Data: 100%
⚠ Meta Tags: 92.0%
⚠ CSS differences: 13
⚠ Layout differences: 1
Overall Match: 97.4%
   ↳ Meta Tags:
       + meta:twitter:title = "…"      (candidate adds a tag legacy lacks)
   ↳ CSS:
       − missing rule footer{…}        (legacy rule the candidate doesn't have)
   ↳ Layout:
       + 0:div                          (one extra wrapper element)
```

Run one page (the common check — old production vs the new site):

```bash
node structure-check.mjs \
  --legacy=https://airpiv.com/city/berlin \
  --candidate=https://<preview>.vercel.app/city/berlin
```

Run the whole `PAGES` list across two hosts:

```bash
node structure-check.mjs \
  --legacy-base=https://airpiv.com \
  --candidate-base=https://<preview>.vercel.app
```

Noise is normalized so only **real** drift is reported: every host that means
"this site" (both serving origins + the canonical production domain, override
with `--prod-origin=`) collapses to `https://SITE` (so canonical / hreflang /
JSON-LD / self-links match across domains); Next.js's framework injections
(`/_next/*` scripts, preload links) are excluded from the layout signature; and
CSS is compared by **rule contents** (fetched and canonicalized to erase
prettified-vs-minified formatting), counting only legacy rules the candidate is
**missing** — the ones that can actually change how the page looks. Writes
`shots/structure-report.json`; exits non-zero if any page is below 100%.
