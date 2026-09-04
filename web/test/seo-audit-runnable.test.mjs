// [SEO-AUDIT-RUNNABLE] P0(plan)-1 guard. scripts/audit-route-data.mjs (the
// seo-audit.yml daily guard) imports lib/content-api.js → lib/geo.js →
// lib/languages.js. Those used EXTENSIONLESS relative imports ('./geo'), which
// webpack/Next resolves but plain Node ESM does NOT — so the CI guard crashed
// with ERR_MODULE_NOT_FOUND and (behind a `| tee`) passed silently. This pins
// that the whole chain RESOLVES under plain Node, so a re-introduced
// extensionless import fails a fast unit test instead of a silent CI guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the audit import chain resolves under plain Node (no extensionless import)', async () => {
  // A failed module resolution here throws ERR_MODULE_NOT_FOUND at import time.
  const contentApi = await import('../lib/content-api.js');
  assert.equal(typeof contentApi.listRoutePages, 'function', 'content-api loads and exports listRoutePages');
  const audit = await import('../lib/seo/route-data-audit.mjs');
  assert.equal(typeof audit.auditRoutes, 'function', 'route-data-audit loads and exports auditRoutes');
  // geo + languages are the two modules whose extensionless imports broke it.
  const geo = await import('../lib/geo.js');
  assert.equal(typeof geo.buildGeoIndex, 'function', 'geo loads and exports buildGeoIndex');
});

test('auditRoutes runs on an empty list and returns a well-formed report', async () => {
  const { auditRoutes } = await import('../lib/seo/route-data-audit.mjs');
  const r = auditRoutes([]);
  assert.equal(r.total, 0);
  assert.equal(r.bySeverity.critical, 0);
  assert.ok(Array.isArray(r.issues));
});
