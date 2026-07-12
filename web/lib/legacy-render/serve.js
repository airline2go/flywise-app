// Shared helper for the verbatim SEO Route Handlers: wrap a rendered HTML
// string (or null → 404) in the right Response.
export function htmlResponse(html) {
  if (!html) return new Response('Not found', { status: 404 });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
