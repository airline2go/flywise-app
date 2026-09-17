// Dynamic sitemap INDEX (/sitemap.xml) — the only sitemap robots.txt points at.
// It references one child sitemap per type. During the controlled recovery
// phase, the route sitemap is mandatory even when a backend sitemap-data feed
// is temporarily empty, because the dedicated route handler has a core-only
// fallback and can safely serve the 70-route recovery cohort.
import { buildSitemapIndex } from '@/lib/sitemap-urls';

const ROUTE_SITEMAP_URL = 'https://airpiv.com/sitemap-routes.xml';

export const revalidate = 3600;

export async function GET() {
  let xml = await buildSitemapIndex();
  if (!xml.includes(`<loc>${ROUTE_SITEMAP_URL}</loc>`)) {
    xml = xml.replace(
      '</sitemapindex>',
      `  <sitemap><loc>${ROUTE_SITEMAP_URL}</loc></sitemap>\n</sitemapindex>`,
    );
  }

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
