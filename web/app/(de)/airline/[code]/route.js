// German airline page (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js. Route Handler so the full original document is
// returned without Next's root layout wrapping it.
import { renderAirlineHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { code } = await params;
  return htmlResponse(await renderAirlineHtml(code, 'de'));
}
