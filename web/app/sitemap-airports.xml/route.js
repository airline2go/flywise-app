// Per-type entity sitemap (sitemap-airports.xml) — every airports URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
import { buildAirportUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

// Keep entity sitemap freshness aligned with the route sitemap (15 minutes).
export const revalidate = 900;

export const GET = makeTypeSitemapRoute(buildAirportUrls);
