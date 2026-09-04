# RCA — Organic traffic / indexing cliff on 2026-08-18 (P0-6)

Evidence-based root-cause analysis of the drop the plan flagged "around 18 August
2026". Built from Google Search Console (Search Analytics), the Git history of
both repos, and the existing edge-middleware audit. Every claim below cites its
evidence; nothing is asserted as root cause without it.

## 1. Timeline

| Date | Deployment / change | Technical effect | Google crawl/index effect | Traffic effect (GSC) |
| --- | --- | --- | --- | --- |
| Aug 6–9 | (last app deploy Aug 10; last server deploys ≤ Aug 10) | site healthy, pages served from ISR cache | pages indexing well | impressions ramping: 886 → 1,080 → 1,395 → **1,777 (peak Aug 9)** |
| Aug 11–17 | none (no commits to either repo's `main`) | steady | steady | strong: ~840–1,146/day, avg position ~13–17; route pages dominate |
| **Aug 16–18** | **no code deploy** — aggressive non-search crawlers hammer the site | **Vercel Fluid Active CPU spike** (edge-middleware audit) → backend-dependent SEO pages render slow / error | Googlebot hits slow/failed route renders | — |
| **Aug 18** | — | — | mass devaluation | **cliff: impressions 909 → 123 (−86%); avg position 17.5 → 66.5** |
| Aug 18 – Sep 2 | (bot-guard middleware added ~Aug 31) | — | pages stay de-ranked | crushed: 16–65 impressions/day, position ~55–66 |

### The cliff (GSC daily)

```
Aug 15   842 impr   pos 16.9
Aug 16 1,133        pos 16.9
Aug 17   909        pos 17.5
Aug 18   123  ⬇-86% pos 66.5  ⬇+49
Aug 19   108        pos 61.8
Aug 20    63        pos 61.8
```

A **single-day cliff** (not a gradual decline) rules out a slow content-quality
decay or a rolling algorithm update; it is the signature of a **technical event**.

## 2. Root cause

**Crawler-induced CPU exhaustion on Vercel (Aug 16–18) made the backend-dependent
SEO pages unreachable/slow for Googlebot, which devalued them en masse on Aug 18.**

The SEO route/entity pages server-render on an ISR cache **miss** by fetching the
Render backend (see `lib/legacy-render/render.js`, `content-api.js`). When
aggressive crawlers drove a Fluid Active CPU spike, those renders degraded — so
Googlebot, crawling in that window, met slow/failed pages and dropped their
ranking. The **static homepage**, served verbatim from `public/index.html` with
no backend dependency, was largely spared — which is exactly what the data shows.

### Page-type differential (the mechanism proof)

Impressions, week before vs week after the cliff, by top path segment:

| Path | Aug 11–17 | Aug 18–24 | Change | Backend-rendered? |
| --- | --- | --- | --- | --- |
| `flights` (DE routes) | 2,176 | 116 | **−95%** | yes |
| `it` | 1,315 | 21 | −98% | yes |
| `fr` | 1,457 | 77 | −95% | yes |
| `es` | 528 | 10 | −98% | yes |
| `en` | 846 | 164 | −81% | yes |
| `nl` / `tr` / `ar` | 437 / 273 / 79 | 28 / 30 / 9 | −89…−94% | yes |
| **root `""` (static home)** | **10** | **6** | **−40%** | **no** |

The backend-dependent pages fell 90–98%; the static homepage barely moved. A
content or manual-action penalty would not spare one page type by its rendering
path — a crawl/serve failure of the backend-rendered pages does exactly this.

## 3. Contributing factors

1. **No edge/WAF bot protection at the time.** `robots.txt` is advisory only;
   nothing throttled Bytespider/PetalBot/Ahrefs/Semrush/GPTBot/etc. at the edge,
   so they were free to exhaust CPU. (Fixed since — see §5.)
2. **Every SEO page's freshness depends on a live backend fetch.** An ISR miss
   renders by calling Render, so backend/CPU pressure maps directly onto
   crawlable-page availability.
3. **Degraded responses could reach crawlers as soft failures.** The rendering
   response contract was not explicit/tested at the time (addressed by P0-4 this
   cycle: upstream errors now throw → 5xx + stale ISR, never a cached
   200-but-empty/noindex).

## 4. Evidence & confidence

- **GSC Search Analytics** — single-day cliff on Aug 18 (§1) and the page-type
  differential (§2). *(source: searchconsole `sc-domain:airpiv.com`.)*
- **Git history** — **no commits to `main` on either repo between Aug 10 and
  Aug 27**, so the drop was **not** a code deploy. *(GitHub API, both repos.)*
- **Edge-middleware audit** — `web/middleware.js` states the aggressive crawlers
  "caused the Aug 16–18 CPU spike"; the bot-guard was the remediation.

**Confidence:**
- *That it was technical (not content/algorithm) and dated Aug 18* — **HIGH**
  (single-day cliff + page-type differential + no content change).
- *That the mechanism was crawler-CPU exhaustion of backend-rendered pages* —
  **MEDIUM-HIGH** (path differential + the middleware audit; a Vercel CPU/RUM
  graph would make it conclusive — see §6).

## 5. Fix

- **Already shipped:** the edge bot-guard (`web/middleware.js`) blocks the
  aggressive crawlers before they burn render CPU, while explicitly allow-listing
  Googlebot/Bingbot/Applebot/DuckDuckBot.
- **Reinforced this cycle (recovery hardening):** P0-4 response contract
  (upstream error → 5xx + stale, never a cached noindex), P0-3 production smoke
  test, P0-5 centralized indexability, P0-7 sitemap↔indexability audit, and the
  P1-8 complete-route reads. These reduce the chance a transient backend problem
  silently de-indexes pages again, and detect it if it recurs.
- **Recovery is pending:** as of Sep 2 impressions were still low; the bot-guard
  landed ~Aug 31, and recrawl/recovery takes weeks. Request re-indexing of the
  top route pages in GSC and monitor.

## 6. Monitoring (so a recurrence is caught early)

- **GSC performance** — watch daily impressions + average position recover toward
  the pre-Aug-18 baseline (~900–1,100 impressions/day, position ~15).
- **Vercel Fluid Active CPU** — alert on a spike; correlate with bot user-agents
  to confirm the guard is holding.
- **The tools built this cycle** — the P0-3 smoke test and P0-7 sitemap audit run
  against the live site and will flag a re-occurrence (5xx/empty/noindex on the
  backend-rendered pages) automatically.

---

*Method: Audit → Evidence → Fix → Test → Deploy → Monitor. This document is the
Audit/Evidence record; the fixes it references are tracked in their own PRs.*
