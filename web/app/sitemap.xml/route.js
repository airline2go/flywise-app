// Dynamic sitemap INDEX (/sitemap.xml) — the only sitemap robots.txt points at.
// It references the crawlable child sitemaps. The index is deliberately
// fail-safe: a transient backend 429 must not make deployments or crawler
// requests return a broken sitemap index.
import { buildSitemapIndex } from '@/lib/sitemap-urls';

const CHILD_SITEMAPS = [
  'https://airpiv.com/sitemap-pages.xml',
  'https://airpiv.com/sitemap-routes.xml',
  'https://airpiv.com/sitemap-cities.xml',
  'https://airpiv.com/sitemap-countries.xml',
  'https://airpiv.com/sitemap-airports.xml',
  'https://airpiv.com/sitemap-airlines.xml',
  'https://airpiv.com/sitemap-blog.xml',
  'https://airpiv.com/sitemap-popular.xml',
  'https://airpiv.com/sitemap-reviews.xml',
  'https://airpiv.com/sitemap-authority.xml',
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function staticFallbackIndex() {
  const body = CHILD_SITEMAPS.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export async function GET() {
  let xml;
  try {
    xml = await buildSitemapIndex();
  } catch (error) {
    console.warn('[sitemap-index] build failed; serving static fallback', error);
    xml = staticFallbackIndex();
  }

  // Never allow a partially built index to hide a valid child sitemap.
  // The builder may omit a type when its feed is temporarily unavailable; the
  // child sitemap itself remains independently crawlable and must stay linked.
  for (const sitemapUrl of CHILD_SITEMAPS) {
    if (!xml.includes(`<loc>${sitemapUrl}</loc>`)) {
      xml = xml.replace(
        '</sitemapindex>',
        `  <sitemap><loc>${sitemapUrl}</loc></sitemap>\n</sitemapindex>`,
      );
    }
  }

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
