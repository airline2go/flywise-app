// German blog post (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js.
import { renderBlogPostHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  return htmlResponse(await renderBlogPostHtml(slug, 'de'));
}
