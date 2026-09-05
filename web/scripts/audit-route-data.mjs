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
import { auditRoutes, blindFields } from '../lib/seo/route-data-audit.mjs';

// [P0-9] Prefer the dedicated full-field audit feed (/route-pages-audit) so the
// auditor sees avg_duration_min/stop_distribution/price_*/all_direct/… that the
// public /route-pages list strips. Requires AUDIT_TOKEN (+ API_BASE). Falls back
// to the public list only if the token is absent — and in that case the audit's
// own blind-field guard will emit CRITICAL findings rather than pass silently.
async function fetchAuditRows() {
  const token = process.env.AUDIT_TOKEN;
  const base = process.env.API_BASE || 'https://api.airpiv.com';
  if (token) {
    const all = [];
    for (let page = 0; page < 10000; page++) {
      const res = await fetch(`${base}/route-pages-audit?page=${page}`, { headers: { 'x-audit-token': token } });
      if (!res.ok) throw new Error(`/route-pages-audit page ${page} → HTTP ${res.status}`);
      const data = await res.json();
      const rows = (data && data.routes) || [];
      all.push(...rows);
      if (!data || !data.hasMore || rows.length === 0) break;
    }
    return { rows: all, source: '/route-pages-audit (full fields)' };
  }
  const { listRoutePages } = await import('../lib/content-api.js');
  return { rows: await listRoutePages(), source: '/route-pages (public, field-stripped)' };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const { rows, source } = await fetchAuditRows();
  const blind = blindFields(rows);
  if (!args.has('--json')) {
    console.log(`Route data audit — source: ${source}`);
    if (blind.length) console.log(`  ⚠ AUDIT-BLIND fields (source stripped them): ${blind.join(', ')}`);
  }
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
