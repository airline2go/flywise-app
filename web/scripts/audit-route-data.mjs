// [ROUTE-DATA-AUDIT] Phase 28 CLI sweep. Fetches the full route list via the
// same content-api the site uses and runs lib/seo/route-data-audit over it,
// printing a summary + any issues. Foundation for the Phase 48 daily job.
//
// Usage:  node scripts/audit-route-data.mjs [--json] [--fail-on-critical]
//   --json              print the raw report as JSON
//   --fail-on-critical  exit 1 when any 'critical' issue is found (for CI/cron)
//
// It reads only content-api (no DB writes, no external price calls). The
// stored-airline-count-vs-join check needs the route_airlines join, which the
// content-api route list does not carry, so it is reported by the SQL sweep in
// docs/seo/PHASE-28-DATA-QUALITY.md rather than here.
import { auditRoutes } from '../lib/seo/route-data-audit.mjs';

async function main() {
  const args = new Set(process.argv.slice(2));
  const { listRoutePages } = await import('../lib/content-api.js');
  const rows = await listRoutePages();
  const report = auditRoutes(rows);

  if (args.has('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Route data audit — ${report.total} routes`);
    console.log(`  issues: ${report.issueCount} (critical ${report.bySeverity.critical}, warning ${report.bySeverity.warning})`);
    for (const [code, n] of Object.entries(report.byCode).sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${code}: ${n}`);
    }
    for (const i of report.issues.slice(0, 50)) {
      console.log(`    [${i.severity}] ${i.slug} ${i.code}: ${i.detail}`);
    }
    if (report.issues.length > 50) console.log(`    … and ${report.issues.length - 50} more`);
  }

  if (args.has('--fail-on-critical') && report.bySeverity.critical > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
