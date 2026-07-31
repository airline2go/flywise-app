// Dynamic sitemap INDEX (/sitemap.xml) — the only sitemap robots.txt points at.
// It contains no page URLs itself: it references one child sitemap per type,
// auto-splitting a type into numbered shards when it exceeds Google's 50k-URL /
// 50MB limits. Generated from the database each ISR window (no static file to
// maintain), so deleted pages disappear and new ones appear automatically.
// Replaces the old hand-maintained public/sitemap.xml.
import { buildSitemapIndex } from '@/lib/sitemap-urls';

export const revalidate = 3600;

export async function GET() {
  return new Response(await buildSitemapIndex(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
