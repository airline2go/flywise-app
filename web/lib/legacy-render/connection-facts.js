// [CONNECTION-FACTS] Shared core that turns a set of route "connections"
// (each: the far endpoint of one of an entity's routes, plus that route's
// metadata) into the real, data-gated facts a city or airport page presents —
// distinct destinations, reachable countries, international/domestic split,
// distance extremes, and popularity ranking. Both render-city and
// render-airport build their `conns` list their own way (cities match on
// city_slug, airports on IATA) and hand it here, so the fact logic lives in
// exactly one place. Nothing is invented: a signal that no connection carries
// (no distance, no popularity score) simply produces no fact.
const { localizeCity, localizeCountry } = require('./data');
const { getLanguage } = require('./languages');

// Locale-aware number formatting (1.493 in de, 1,493 in en, ١٬٤٩٣ in ar).
function nfmt(n, lang) {
  return Number(n).toLocaleString(getLanguage(lang).locale);
}

// List separator that reads naturally per language (Arabic uses its own comma).
function listSep(lang) {
  return lang === 'ar' ? '، ' : ', ';
}

// Build a slug -> {distance_km, haul_type, airline_count, route_score} lookup
// from the full route-pages list, used to enrich the metadata-light route
// objects the /cities/:slug and /airports/:code endpoints return.
function buildRouteMetaMap(routeList) {
  const map = {};
  (routeList || []).forEach((r) => {
    map[r.slug] = {
      distance_km: r.distance_km,
      haul_type: r.haul_type,
      airline_count: r.airline_count,
      route_score: r.route_score,
    };
  });
  return map;
}

// conns: [{ slug, otherCitySlug, otherCityRaw, otherIata, otherCountry, m }]
//   where m is the route metadata ({distance_km, airline_count, route_score…}).
// homeCountry: the entity's own country code, for the international/domestic
//   split. Returns the shared fact bundle both page types render from.
function summarizeConnections(conns, homeCountry, lang) {
  const infoScore = (c) =>
    (typeof c.m.route_score === 'number' ? 4 : 0) +
    (typeof c.m.airline_count === 'number' ? 2 : 0) +
    (typeof c.m.distance_km === 'number' ? 1 : 0);

  // Collapse both directions of the same pair to one destination, keeping the
  // row that carries the richer metadata.
  const byDest = new Map();
  for (const c of conns) {
    if (!c.otherCitySlug) continue;
    const prev = byDest.get(c.otherCitySlug);
    if (!prev || infoScore(c) > infoScore(prev)) byDest.set(c.otherCitySlug, c);
  }

  const dests = [...byDest.values()].map((c) => ({
    slug: c.otherCitySlug,
    iata: c.otherIata,
    country: c.otherCountry,
    name: localizeCity(c.otherCityRaw, c.otherIata, lang),
    m: c.m,
  }));

  const countryCounts = new Map();
  for (const d of dests) {
    if (!d.country) continue;
    countryCounts.set(d.country, (countryCounts.get(d.country) || 0) + 1);
  }
  const countryCodes = [...countryCounts.keys()];
  const countries = countryCodes.map((code) => ({
    code,
    name: localizeCountry(code, code, lang),
    count: countryCounts.get(code),
  }));
  countries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const internationalCount = dests.filter((d) => d.country && d.country !== homeCountry).length;
  const domesticCount = dests.filter((d) => d.country && d.country === homeCountry).length;

  const withDist = dests.filter((d) => typeof d.m.distance_km === 'number' && d.m.distance_km > 0);
  let distances = null;
  if (withDist.length) {
    const sorted = [...withDist].sort((a, b) => a.m.distance_km - b.m.distance_km);
    const shortest = sorted[0];
    const longest = sorted[sorted.length - 1];
    const avg = Math.round(withDist.reduce((s, d) => s + d.m.distance_km, 0) / withDist.length);
    distances = {
      shortest: { name: shortest.name, km: shortest.m.distance_km },
      longest: { name: longest.name, km: longest.m.distance_km },
      avg,
    };
  }

  const hasPopularity = dests.some(
    (d) => typeof d.m.route_score === 'number' || typeof d.m.airline_count === 'number',
  );
  const ranked = [...dests].sort((a, b) => {
    const sa = typeof a.m.route_score === 'number' ? a.m.route_score : -1;
    const sb = typeof b.m.route_score === 'number' ? b.m.route_score : -1;
    if (sb !== sa) return sb - sa;
    const aa = typeof a.m.airline_count === 'number' ? a.m.airline_count : -1;
    const ab = typeof b.m.airline_count === 'number' ? b.m.airline_count : -1;
    if (ab !== aa) return ab - aa;
    const da = typeof a.m.distance_km === 'number' ? a.m.distance_km : Infinity;
    const db = typeof b.m.distance_km === 'number' ? b.m.distance_km : Infinity;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });

  return {
    destinationCount: dests.length,
    countries,
    countryCount: countryCodes.length,
    internationalCount,
    domesticCount,
    distances,
    hasPopularity,
    popularDestination: hasPopularity ? ranked[0] : null,
    topDestinations: hasPopularity ? ranked.slice(0, 8) : [],
  };
}

module.exports = { nfmt, listSep, buildRouteMetaMap, summarizeConnections };
