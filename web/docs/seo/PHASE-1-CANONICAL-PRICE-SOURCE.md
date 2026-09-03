# Phase 1 — Canonical Route Price Source

**Fixes:** Finding F-1 (P0) from `PHASE-0-BASELINE-AUDIT.md`.
**Requires production:** No. **Behaviour-preserving** wherever `price_min` was
already the source; only aligns the title/meta onto that same value.

## Problem (OLD architecture)

A route page resolved its headline "from" price from **two** different fields:

```
<title> facet  ─┐
meta "from …"   ┴─▶ route.cached_price      (no exposed timestamp)

hero CANON_PRICE ─┐
JSON-LD Offer     ┴─▶ route.price_min        (sample-backed aggregate)
```

So a route with `cached_price = 83 €` and a sample-backed `price_min = 60 €`
advertised **"from 83 €"** in the SERP title/description while the page's hero
fallback and its `Offer` structured data showed **60 €**. This is the
"title price ≠ page price" contradiction the master spec forbids.

## Solution (NEW architecture)

One resolver, `resolveCanonicalPrice(route)` in
`lib/legacy-render/render-flight-route.js`, is the single source of truth:

```
                       resolveCanonicalPrice(route)
                                  │
        ┌──────────────┬──────────┴────────┬─────────────────┐
   <title> facet   meta "from …"   hero CANON_PRICE      JSON-LD Offer
```

Resolution order (deliberate, non-fabricated):

1. **Aggregate minimum** (`price_min`, when `> 0` and `price_sample_count ≥ 3`)
   — the "from"/lowest semantic is exactly what `price_min` represents, and it
   carries a currency and a `checkedAt` (`price_updated_at`). Same quality bar
   as the visible price panel and the `Offer`.
2. **Cached price** (`cached_price`, when `> 0`) — current cached value; no
   exposed timestamp, so `checkedAt = null` and it is **never** labelled "live".
3. **`null`** — callers render an explicit "unavailable" state; **no invented
   placeholder price** (spec 1.14).

Returned shape: `{ amount, currency, checkedAt, source }` where
`source ∈ {'aggregate-min','cached'}`.

### Semantics kept distinct (spec 1.10)

- **"from" price** (this resolver) — headline/lowest, unified across surfaces.
- **average/typical price** (`price_avg`) — a *different*, clearly-labelled
  statistic in the price panel. **Not** unified with the "from" price.
- **live price** — the client-side hero enhancement from `api.airpiv.com`,
  shown as "live" only when the server snapshot says `isLive` (TTL owned
  server-side). It may legitimately differ from the static canonical price and
  is honestly labelled; the static/SEO price is the unified one.

### Offer emission

The `Offer` is emitted **only** when `source === 'aggregate-min'` (i.e. the
sample-backed quality bar is met), so structured data is never a
fabricated-quality quote — and its `price`/`priceCurrency` come straight from
the resolver, guaranteeing equality with the hero, title and meta.

## Files changed

- `lib/legacy-render/render-flight-route.js`
  - add `resolveCanonicalPrice()`; export it
  - `buildRouteTitle`: `hasPrice = resolveCanonicalPrice(route) != null`
  - `buildRouteMetaDescription`: "from" clause from resolver
  - `buildLiveScript`: `CANON_PRICE`/`CANON_CCY`/`CANON_DATE` from resolver
  - `Offer`: gated on `source==='aggregate-min'`, price/currency from resolver
- `test/route-price-consistency.test.mjs` (new)

## Tests added

`test/route-price-consistency.test.mjs` asserts:
- when `cached_price` and sample-backed `price_min` **disagree**, title/meta/hero
  fallback/Offer all show the aggregate min (60), never 83;
- cached-only routes use the cached value everywhere, with `CANON_DATE=null`
  and **no** Offer;
- null/zero/negative/malformed/below-threshold prices resolve to `null` (no
  surface shows a price, none is invented);
- a below-threshold `price_min` falls back to `cached_price`;
- currency is carried from the chosen source (GBP → "£40"), never assumed EUR.

## Validation

- `node --test` full suite: **221 pass**, 2 failures that are **pre-existing on
  the clean branch** and unrelated to this change (F-4 `sitemap-sharding`,
  F-5 `seo-analyze`).
- All price/meta/title/live-script tests pass (30+).
- ESLint could not run in this environment (dev `node_modules` not installed);
  the change follows the file's existing style.

## Known limitations / out of scope (spec 1.17)

- Does not touch the `price_avg` panel, sitemap/robots/hreflang architecture,
  URL structure, content volume, or booking/Duffel logic.
- Publication-gating on validation failure (F-2) and a central TTL policy
  module (F-3) remain open follow-ups recorded in the baseline.
