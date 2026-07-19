// German country page (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js. Route Handler so the full original document is
// returned without Next's root layout wrapping it.
import { renderCountryHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { code } = await params;
  return htmlResponse(await renderCountryHtml(code, 'de'));
}
