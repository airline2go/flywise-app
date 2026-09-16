// Localized "Popular destinations" hub (/en/popular, /ar/popular, …). Route
// Handlers aren't wrapped by [lang]/layout.js, so the language prefix is
// validated here: an unknown or default-language (/de/popular) prefix 404s,
// matching how the other localized entity handlers behave (German lives
// unprefixed at /popular).
import { renderPopularHtml } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

// [BUILD-SAFETY] The popular hub performs a catalogue-wide ranking. Keep
// localized variants on-demand as well, so static generation cannot be blocked
// by the same expensive upstream aggregation.
export const dynamic = 'force-dynamic';
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderPopularHtml(lang));
}
