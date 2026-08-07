'use strict';

// ⚠️ GSC SAMPLE / IMPORT — DEVELOPMENT FIXTURE ONLY, NOT LIVE PRODUCTION DATA.
//
// The Priority (Tier A) routes from the Google Search Console export dated
// 01/08/2026–06/08/2026, in the RAW shape a GSC export/API hands over (a `page`
// URL + impressions + position per row) so it also exercises lib/seo/normalize.
// It exists to test and demo the classifier/report; it is intentionally NOT in
// lib/ and is imported by NO production code path. Connect a live GSC feed to
// the admin route to replace it — the classifier/report never change.
//
// Only `page`, `impressions`, `position` are real figures from the export.
// `clicks` is omitted on purpose: the export carried click totals only at the
// country/device level (Germany 3, Spain 0 / Mobile 3, Desktop 0), NOT per URL —
// so per-URL clicks are UNKNOWN and are never invented as 0. There is likewise
// no per-URL query column, so the report's "primary query" stays n/a rather than
// asserting a single winning term per page.

// Raw rows exactly as a GSC "Pages" export row looks (no clicks column here).
const GSC_SAMPLE_ROWS = [
  { page: 'https://airpiv.com/flights/hamburg-barcelona-2', impressions: 109, position: 9.28 },
  { page: 'https://airpiv.com/flights/hannover-leipzig', impressions: 87, position: 8.70 },
  { page: 'https://airpiv.com/flights/ibiza-frankfurt', impressions: 70, position: 9.31 },
  { page: 'https://airpiv.com/flights/jfk-lax', impressions: 49, position: 9.78 },
  { page: 'https://airpiv.com/flights/copenhagen-berlin', impressions: 31, position: 7.45 },
  { page: 'https://airpiv.com/flights/berlin-copenhagen', impressions: 29, position: 9.52 },
  { page: 'https://airpiv.com/flights/london-amsterdam', impressions: 21, position: 10.90 },
  { page: 'https://airpiv.com/flights/palma-de-mallorca-duesseldorf', impressions: 20, position: 9.15 },
  { page: 'https://airpiv.com/flights/berlin-stuttgart', impressions: 16, position: 10.12 },
  { page: 'https://airpiv.com/flights/madrid-ibiza', impressions: 16, position: 4.62 },
  { page: 'https://airpiv.com/flights/palma-de-mallorca-hamburg', impressions: 15, position: 9.60 },
  { page: 'https://airpiv.com/flights/jfk-ord', impressions: 14, position: 7.14 },
  { page: 'https://airpiv.com/flights/munich-duesseldorf', impressions: 13, position: 10.85 },
  { page: 'https://airpiv.com/flights/frankfurt-valencia', impressions: 9, position: 9.00 },
  { page: 'https://airpiv.com/flights/fra-hel', impressions: 9, position: 9.67 },
];

// Expected opportunity category per slug (the real numbers above, classified) —
// used by the report test as a regression guard.
const EXPECTED_CATEGORY = {
  'hamburg-barcelona-2': 'VERY_HIGH',
  'hannover-leipzig': 'VERY_HIGH',
  'ibiza-frankfurt': 'VERY_HIGH',
  'jfk-lax': 'VERY_HIGH',
  'copenhagen-berlin': 'HIGH',
  'berlin-copenhagen': 'HIGH',
  'london-amsterdam': 'HIGH',
  'palma-de-mallorca-duesseldorf': 'HIGH',
  'berlin-stuttgart': 'NORMAL',
  'madrid-ibiza': 'BREAKOUT',
  'palma-de-mallorca-hamburg': 'NORMAL',
  'jfk-ord': 'NORMAL',
  'munich-duesseldorf': 'NORMAL',
  'frankfurt-valencia': 'NORMAL',
  'fra-hel': 'NORMAL',
};

module.exports = { GSC_SAMPLE_ROWS, EXPECTED_CATEGORY };
