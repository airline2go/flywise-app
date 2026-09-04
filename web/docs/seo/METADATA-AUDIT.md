# Route metadata audit — duplicate titles & thin signals (P2-24/25/26)

A **report-only** tool (`scripts/audit-seo-metadata.mjs`, logic in
`lib/seo/metadata-audit.mjs`) that walks the complete route feed (all 2,347
routes via the P1-8 pagination) and flags SEO-metadata quality issues. It
changes nothing — the plan forbids a mass title rewrite without a baseline; this
is the baseline.

Run: `node scripts/audit-seo-metadata.mjs` (add `--json` for machine output).

## Headline findings (live, 2026-09-04)

- **Duplicate titles: 125 city-pairs cover 255 routes.** Route pages title
  deterministically as "Flights from <origin_city> to <destination_city>", so
  multiple slugs on the same city pair render the **same `<title>`**. Three
  distinct patterns:
  1. **Suffix duplicates** — `frankfurt-hamburg`, `frankfurt-hamburg-2`,
     `frankfurt-hamburg-3`. Near-certainly redundant rows for one route.
  2. **Slug-style variants** — `ams-vie` vs `amsterdam-vienna` (IATA-pair vs
     city-name). The same route under two URL conventions → a canonical / URL
     normalization question (P0-28).
  3. **Different airports, one city title** — `auh-lgw` vs `auh-lhr` (Gatwick vs
     Heathrow), `ist-lgw` / `ist-lhr` / `istanbul-london`. Legitimately distinct
     routes whose titles collide because the title uses the city, not the
     airport → a title-differentiation opportunity.
- **Reversible pairs: 1,109** (both A→B and B→A exist). Normal; noted so
  internal-linking/related logic can treat them as a set.
- **Non-indexable (backend thin flag): 0** and **no-data-signal rows: 0** — the
  published catalogue is data-complete; there is no thin-content problem to act
  on at the data level.

## Recommended follow-up (decide policy, then act — not in this PR)

1. **Suffix duplicates (`-2`/`-3`)**: confirm whether they are real distinct
   routes or data dupes. If dupes, de-duplicate at the source (backend) and
   301/canonical the extras.
2. **Slug-style variants**: pick one canonical slug form per route and
   canonical/redirect the other (ties into P0-28 URL normalization).
3. **Different-airport collisions**: differentiate the `<title>` by airport
   (e.g. "… to London Heathrow"), so each indexable page has a unique title.

Each is a deliberate, measurable change with a rollback — to be taken after this
report, not blind.
