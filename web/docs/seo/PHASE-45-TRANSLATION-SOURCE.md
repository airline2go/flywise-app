# Phase 45 — Translation Source Integrity

## Finding (F-9, P1)

The SEO renderer already resolves every phrase through **one** source —
`translations/*.json` (via `lib/legacy-render/translate.js`, fallback
lang → en → de → key); the old hardcoded `de ? … : …` branches were already
removed. So the "two sources" risk was solved. The residual, real bug was a
**silent fallback from missing keys**:

`tr.json` was missing the six keys the renderer actually uses —
`routeTitlePrimary`, `routeTitleFacts`, `routeTitleDirect`, `routeTitleBase`,
`routeMeta`, `routeMetaPrice` — and instead carried six **orphan** keys from an
older template (`routeTitleInfo`, `routeMetaBase`, `routeMetaFrom`,
`routeMetaDistance`, `routeMetaDirectYes`, `routeMetaDirectAll`) that no code
references. Result: **every Turkish route page rendered its `<title>` and meta
description in English** (the fallback chain), on the two most important SEO
fields.

## Fix

- `translations/tr.json`: added the six canonical keys with real Turkish copy;
  removed the six dead orphan keys. All 8 languages now share the **same 363-key
  set**.
- Turkish now renders natively, e.g.
  `İstanbul-Atina Uçuşları – Fiyatlar, Uçuş Süresi ve Havayolları | Airpiv`.

## Regression guard

`test/translation-parity.test.mjs` asserts every language file has the identical
key set, no blank values, and that the route title/meta keys exist in every
language — so a divergence like this fails CI instead of shipping as an
English-in-Turkish page.

## Out of scope

Entity *names* (city/airport names) come from the DB via `content-api` +
`localizeCity` — a separate, already-single source — and are not touched here.
Full editorial review of translation *wording* across all languages is a P3
content pass, not this structural fix.
