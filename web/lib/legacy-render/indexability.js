// [INDEXABILITY-POLICY] P0-5 — the ONE place that decides whether a rendered
// page is indexable. Before this, each render-*.js computed its own
// `robotsContent` inline with a slightly different threshold expression, so the
// policy lived in five places and could drift. Now every renderer calls
// `robotsMeta(page)` / `isIndexable(page)` here, and the per-type thresholds
// are defined once, together, where they can be read and tested as a unit.
//
// The policy is behaviour-preserving: each branch below is the exact rule the
// corresponding renderer already used (verified against render-*.js and pinned
// by test/render-seo-guards.test.mjs + test/indexability.test.mjs). Changing an
// indexability threshold now means changing it HERE — deliberately, with the
// truth-table test updated — instead of editing one renderer and forgetting the
// others.
//
// Shared shape of the decision, across every page type:
//   noindex  ⇔  the page is THIN (not enough real data to be distinct)
//               AND has no admin-authored content to make it worthwhile;
//   plus, for flight routes, an override: genuinely broken/contradictory data
//   (a critical snapshot error) is never indexed even if it isn't thin.
// `follow` is always kept so link equity flows regardless of index state.
//
// CommonJS to match the other legacy-render modules.

const INDEX = 'index, follow';
const NOINDEX = 'noindex, follow';

// Is a page indexable? `page.type` selects the rule; the remaining fields are
// the typed signals that rule needs. Unknown types default to indexable (the
// renderer would not call this for a page it means to hide).
function isIndexable(page) {
  switch (page && page.type) {
    case 'flight-route':
      // Thin ⇔ no real route data AND no admin-authored route content.
      // Critical data errors (invalid route / malformed price / impossible
      // stop total) are never indexable regardless of thinness.
      return !((!page.hasRealRouteData && !page.hasAdminContent) || page.hasCriticalError);

    case 'airport':
    case 'city':
      // A single-destination entity is templated/thin unless it carries
      // admin-authored content.
      return !(page.destinationCount <= 1 && !page.hasAdminContent);

    case 'country':
      // Countries count international destinations + domestic connections.
      return !((page.destinationCount + page.domesticCount) <= 1 && !page.hasAdminContent);

    case 'airline':
      // Airlines are thin with at most one route page and no admin content.
      return !(page.routeCount <= 1 && !page.hasAdminContent);

    default:
      return true;
  }
}

// The `<meta name="robots">` content string for a page.
function robotsMeta(page) {
  return isIndexable(page) ? INDEX : NOINDEX;
}

module.exports = { isIndexable, robotsMeta, INDEX, NOINDEX };
