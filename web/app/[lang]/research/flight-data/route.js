// English authority/data asset: /en/research/flight-data.
// Other language prefixes are intentionally excluded until translated copy exists;
// this avoids publishing machine-fallback or mismatched hreflang content.
import { renderAuthorityHtml } from '@/lib/legacy-render/render-authority.mjs';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;
export const dynamicParams = true;

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (lang !== 'en' || !isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderAuthorityHtml('en'));
}
