const { SEO_CORE_ROUTES, isRouteSitemapEligible } = require('../legacy-render/route-evidence.js');

// Recovery-only sitemap source selection. The dedicated sitemap feed is the
// preferred source when it is healthy; the route catalogue is the bounded,
// code-versioned fallback when that feed is empty/partial during a deploy.
// Nothing outside the 70-route recovery core can pass this selector.
function selectRecoveryRouteSitemapRoutes(primaryRoutes, catalogueRoutes) {
  const primary = Array.isArray(primaryRoutes)
    ? primaryRoutes.filter((route) => route && (route.id || route.slug))
    : [];
  if (primary.length >= SEO_CORE_ROUTES.size) return primary;

  const catalogue = Array.isArray(catalogueRoutes) ? catalogueRoutes : [];
  const fallback = catalogue.filter(isRouteSitemapEligible);
  return fallback.length ? fallback : primary;
}

module.exports = { selectRecoveryRouteSitemapRoutes };
