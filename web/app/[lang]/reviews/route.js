// Localized Airpiv reviews hub (/en/reviews, /ar/reviews, …). Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated
// here: an unknown or default-language (/de/reviews) prefix 404s, matching
// how the other localized hub handlers behave (German lives unprefixed at
// /reviews).
import { renderReviewsHtml } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net; new/published reviews refresh this page immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderReviewsHtml(lang));
}
