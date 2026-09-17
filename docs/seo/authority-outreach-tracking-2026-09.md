# Airpiv Authority Outreach Execution Tracker — September 2026

## Purpose

Track the external authority campaign without treating targets as acquired links. A target becomes a verified backlink only after the published source page, destination URL, anchor/context, publication date, and indexed status are independently checked.

## Status model

`candidate` → `qualified` → `contacted` → `published` → `indexed` → `measured`

`rejected` is used when the placement is irrelevant, manipulative, paid-for ranking value without a qualifying link, reciprocal-only, automated, or otherwise outside the campaign rules.

## Evidence required before marking `published`

- Public source URL.
- Exact Airpiv destination URL.
- Visible placement context.
- Anchor text or linked brand text.
- Publication/update date when available.
- Screenshot or archived evidence stored with the campaign record.

## Evidence required before marking `indexed`

- Search-engine indexed source page confirmed by an independent check.
- Link remains live and resolves successfully.
- No unexpected redirect, noindex, or removal of the link.

## Primary Airpiv assets

1. `/research/flight-data`
2. Route-network research asset
3. Germany airport-connectivity research asset

## Wave 1 — public data/statistical sources

| Priority | Target | Status | Intended Airpiv target | Link rationale | Evidence |
|---|---|---|---|---|---|
| P1 | Statistikportal / German statistical offices | candidate | `/research/flight-data` | Complementary public route-index reference alongside official aviation statistics. | Not contacted; no link claimed. |
| P1 | Destatis / GENESIS | candidate | `/research/flight-data` | Complementary route-coverage/index context for official aviation tables. | Not contacted; no link claimed. |
| P1 | GovData / Open.NRW | candidate | `/research/flight-data` | Route-data reference can complement the airport starts/landings dataset. | Not contacted; no link claimed. |
| P1 | DFS Deutsche Flugsicherung | candidate | Route-network research asset | Consumer-facing route catalogue as complementary context to DFS air-transport-network geodata. | Not contacted; no link claimed. |
| P1 | EUROCONTROL ADRR | candidate | `/research/flight-data` | Public-facing route-index context for non-restricted research use cases. | Not contacted; no link claimed. |
| P1 | EUROCONTROL Route Network Chart | candidate | Route-network research asset | Thematic route-network methodology/reference context. | Not contacted; no link claimed. |

## Wave 2 — aviation research and methodology

| Priority | Target | Status | Intended Airpiv target | Suggested context | Evidence |
|---|---|---|---|---|---|
| P2 | EUROCONTROL Route network / airspace design | candidate | Route-network research asset | Route-network methodology/resource reference. | Not contacted; no link claimed. |
| P2 | Destatis aviation publications | candidate | `/research/flight-data` | Aviation data publication context. | Not contacted; no link claimed. |
| P2 | GENESIS monthly airport table | candidate | Germany airport-connectivity asset | German airport connectivity/data context. | Not contacted; no link claimed. |
| P2 | DFS flight tracks / procedures | candidate | Route-network research asset | Aviation-data methodology context; no endorsement requested. | Not contacted; no link claimed. |

## Outreach rules

- Prefer contextual editorial citations over directory/profile placements.
- Use branded or topic-relevant anchors; do not force repetitive exact-match commercial anchors.
- Link to the most relevant Airpiv research or route asset, not the homepage by default.
- Do not request a reciprocal link as a condition of inclusion.
- Do not use automated backlink services, bulk directory submissions, link exchanges, or paid links intended to pass ranking value.
- Do not claim that an institution will link before a real placement is published.

## Measurement fields

For every verified placement, record:

`source_domain`, `source_url`, `destination_url`, `anchor_text`, `context_type`, `publication_date`, `first_seen_at`, `indexed_at`, `link_status`, `referring_domain_status`, `gsc_impressions_before`, `gsc_impressions_after`, `gsc_clicks_before`, `gsc_clicks_after`, `gsc_position_before`, `gsc_position_after`, `notes`.

## Current campaign baseline

The refreshed GSC baseline uses Search Console web data for 2026-08-20 through 2026-09-15; data is settled through 2026-09-15. This baseline is for later measurement and must not be treated as proof that an external link caused a ranking change.

Current route opportunities in the baseline include:

| Airpiv page | Impressions | Clicks | Avg. position |
|---|---:|---:|---:|
| `/en/flights/lgw-pmi` | 50 | 0 | 66.68 |
| `/flights/stuttgart-malaga` | 45 | 0 | 70.27 |
| `/flights/frankfurt-ibiza` | 46 | 0 | 74.85 |
| `/flights/ibiza-duesseldorf` | 34 | 0 | 73.24 |
| `/flights/duesseldorf-barcelona` | 28 | 0 | 75.75 |
| `/flights/zrh-pmi` | 1 | 0 | 60.00 |

New route targets should be added only from a refreshed GSC export or another documented evidence source. The six rows above are a measurement baseline, not a claim that every route needs an external link.

## Campaign completion gate

The authority phase is not complete until the tracker contains verified published placements, indexed-status evidence, and a post-placement GSC measurement window. Until then, the target matrix remains planning/execution data only.
