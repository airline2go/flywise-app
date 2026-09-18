// Per-type entity sitemap (sitemap-cities.xml) — every cities URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
import { buildCityUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

// The entity feed is data-driven; do not let a stale route response survive a backend evidence fix.
export const dynamic = 'force-dynamic';

export const GET = makeTypeSitemapRoute(buildCityUrls);
