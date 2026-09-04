// [SEO-METADATA-AUDIT] P2-24/25/26 report driver. Walks the COMPLETE route
// feed (all pages, P1-8) and runs lib/seo/metadata-audit over it, printing the
// duplicate-title / thin / no-signal report. REPORT ONLY — it changes nothing;
// it exists so the team can decide a title-uniqueness / canonical policy from
// evidence rather than mass-rewriting titles blind.
//
// Usage: node scripts/audit-seo-metadata.mjs [--base=https://api.airpiv.com] [--json]

import { auditRouteMetadata, formatMetadataReport } from '../lib/seo/metadata-audit.mjs';

const UA = 'AirpivSeoMetadataAudit/1.0 (+https://airpiv.com)';

function parseArgs(argv) {
  const a = { base: process.env.API_BASE || 'https://api.airpiv.com', json: false };
  for (const x of argv) {
    if (x === '--json') a.json = true;
    else if (x.startsWith('--base=')) a.base = x.slice(7).replace(/\/$/, '');
  }
  return a;
}

async function walkRoutes(base) {
  const all = [];
  for (let page = 0; page < 10000; page++) {
    const res = await fetch(`${base}/route-pages?page=${page}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for /route-pages?page=${page}`);
    const data = await res.json();
    const rows = data.routes || [];
    all.push(...rows);
    if (!data.hasMore || rows.length === 0) break;
  }
  return all;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const routes = await walkRoutes(args.base);
  const report = auditRouteMetadata(routes);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(formatMetadataReport(report));
  // Report-only: exit 0 regardless of findings.
}

main().catch((e) => { console.error(e); process.exit(2); });
