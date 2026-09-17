// Remove the legacy route CTA once the route-specific search panel owns the primary search action.
// Keep this narrowly scoped to the old .route-cta anchor so the search panel's
// .route-search-submit button is never affected.
function removeLegacyRouteCta(html) {
  if (!html) return html;
  return html.replace(/<a\b[^>]*\bclass=["']route-cta["'][^>]*>[\s\S]*?<\/a>/i, '');
}

module.exports = { removeLegacyRouteCta };
