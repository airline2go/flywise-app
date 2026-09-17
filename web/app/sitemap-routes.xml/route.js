// Recovery route sitemap. The dedicated backend sitemap-data feed is preferred,
// but a partial/empty feed must never erase the controlled SEO recovery cohort.
import { listRoutePages, sitemapRoutes } from '@/lib/content-api';
import { listLocalizedRouteSitemap } from '@/lib/localized-route-sitemap';
import recovery from '@/lib/seo/route-sitemap-recovery.js';
import { buildCanonicalSlugMap } from '@/lib/seo/route-canonical.mjs';
import { LANGUAGE_CODES, urlFor } from '@/lib/languages';
import {
  urlsetXml,
  SEO_TEMPLATE_VERSIONS,
  applyTemplateFloor,
} from '@/lib/sitemap-serialize.mjs';

const { selectRecoveryRouteSitemapRoutes } = recovery;
const LANGS = LANGUAGE_CODES;
const ROUTE_SITEMAP_URL_LIMIT = 50000;

function resolveLastmod(...values) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeRoute(route) {
  const id = route && (route.id || route.slug);
  return id ? { ...route, id, slug: route.slug || id } : null;
}

export const revalidate = 900;

export async function GET() {
  const [primary, catalogue] = await Promise.all([
    sitemapRoutes(),
    listRoutePages(),
  ]);
  const selected = selectRecoveryRouteSitemapRoutes(primary, catalogue)
    .map(normalizeRoute)
    .filter(Boolean);

  // Canonical duplicate winners are the only URLs allowed into the sitemap.
  const loserSlugs = buildCanonicalSlugMap(selected);
  const canonicalRoutes = selected.filter((route) => !loserSlugs.has(route.id));
  const floor = SEO_TEMPLATE_VERSIONS.routes;
  const urls = [];

  for (const route of canonicalRoutes) {
    urls.push({
      loc: urlFor('de', `flights/${route.id}`),
      lastmod: applyTemplateFloor(
        resolveLastmod(route.lastmod, route.updated_at, route.insights_updated_at, route.created_at),
        floor,
      ),
    });
  }

  const deRoutes = new Map(canonicalRoutes.map((route) => [route.id, route]));
  const localized = await Promise.all(
    LANGS.filter((lang) => lang !== 'de').map((lang) => listLocalizedRouteSitemap(lang)),
  );

  LANGS.filter((lang) => lang !== 'de').forEach((lang, index) => {
    for (const item of localized[index]) {
      const route = deRoutes.get(item.id);
      if (!route) continue;
      urls.push({
        loc: urlFor(lang, `flights/${item.id}`),
        lastmod: applyTemplateFloor(
          resolveLastmod(item.lastmod, route.lastmod, route.updated_at, route.insights_updated_at, route.created_at),
          floor,
        ),
      });
    }
  });

  return new Response(urlsetXml(urls.slice(0, ROUTE_SITEMAP_URL_LIMIT)), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=900, stale-while-revalidate=86400',
    },
  });
}
