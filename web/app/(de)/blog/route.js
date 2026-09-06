// [P0-5 Option A] German blog listing (/blog) — server-rendered so the article
// list + links are in the raw HTML for crawlers (was client-injected in
// public/blog.html, which now 301s here via next.config.mjs). Mirrors the blog
// post route handler next to it.
import { renderBlogListHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h safety-net; admin edits refresh immediately via /api/revalidate

export async function GET() {
  return htmlResponse(await renderBlogListHtml('de'));
}
