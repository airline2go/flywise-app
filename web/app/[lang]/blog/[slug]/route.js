// Localized blog post — verbatim legacy HTML. Blog content is DE/EN-only, so
// non-en prefixed languages 404 (handled in renderBlogPostHtml).
import { renderBlogPostHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  return htmlResponse(await renderBlogPostHtml(slug, lang));
}
