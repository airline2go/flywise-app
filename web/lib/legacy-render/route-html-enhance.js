// Route-page pricing has been retired. Keep this compatibility helper because
// localized route handlers still import it, but it must never read route data,
// render a stored fare, or mutate route HTML.
export async function renderCanonicalRoutePriceHtml(html) {
  return html;
}

const routeHtmlEnhance = { renderCanonicalRoutePriceHtml };
export default routeHtmlEnhance;
