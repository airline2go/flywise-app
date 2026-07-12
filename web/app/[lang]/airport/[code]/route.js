// Localized airport page (/en/airport/…, /ar/airport/… etc.) — verbatim legacy HTML for the
// requested language, see lib/legacy-render/render.js.
import { renderAirportHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, code } = await params;
  return htmlResponse(await renderAirportHtml(code, lang));
}
