// German blog post (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js.
import { renderBlogPostHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  return htmlResponse(await renderBlogPostHtml(slug, 'de'));
}
