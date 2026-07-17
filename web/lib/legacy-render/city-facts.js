// [CITY-SEO-CONTENT] Derives real, unique facts for a city page from the
// city's own routes joined against the full /route-pages metadata list
// (distance_km / haul_type / airline_count / route_score). Everything here is
// computed from live data — nothing is invented. When a signal is missing for
// a given city (e.g. no route carries a distance, or none has a popularity
// score), the dependent fact is simply omitted rather than guessed, so the FAQ
// and stats shrink gracefully instead of stating anything untrue.
const { localizeCity, localizeCountry } = require('./data');
const { translate, format } = require('./translate');
const { getLanguage } = require('./languages');

// Locale-aware number formatting (e.g. 1.493 in de, 1,493 in en, ١٬٤٩٣ in ar).
function nfmt(n, lang) {
  return Number(n).toLocaleString(getLanguage(lang).locale);
}

// List separator that reads naturally per language (Arabic uses its own comma).
function listSep(lang) {
  return lang === 'ar' ? '، ' : ', ';
}

// Build a slug -> {distance_km, haul_type, airline_count, route_score} lookup
// from the full route-pages list. Used to enrich the lighter route objects the
// /cities/:slug endpoint returns (which carry no distance/score of their own).
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

// Reduce a city's bidirectional route list to the set of distinct places it
// connects to, each annotated with the real metadata of the route that reaches
// it. Both directions of the same city pair collapse to one destination, and
// when both directions exist we keep whichever row carries the richer metadata.
function computeCityFacts(city, routes, routeMetaBySlug, lang) {
  const slug = city.city_slug;
  const meta = routeMetaBySlug || {};

  const conns = (routes || []).map((r) => {
    const isOrigin = r.origin_city_slug === slug;
    return {
      slug: r.slug,
      otherCitySlug: isOrigin ? r.destination_city_slug : r.origin_city_slug,
      otherCityRaw: isOrigin ? r.destination_city : r.origin_city,
      otherIata: isOrigin ? r.destination_iata : r.origin_iata,
      otherCountry: isOrigin ? r.destination_country : r.origin_country,
      m: meta[r.slug] || {},
    };
  });

  const infoScore = (c) =>
    (typeof c.m.route_score === 'number' ? 4 : 0) +
    (typeof c.m.airline_count === 'number' ? 2 : 0) +
    (typeof c.m.distance_km === 'number' ? 1 : 0);

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

  const destinationCount = dests.length;

  // Distinct reachable countries, with a per-country destination count.
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
  // Reachable countries read best largest-first.
  countries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const home = city.country_code;
  const internationalCount = dests.filter((d) => d.country && d.country !== home).length;
  const domesticCount = dests.filter((d) => d.country && d.country === home).length;

  // Distance stats — only from destinations whose route actually carries one.
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

  // A destination ranking is only "popular" if backed by a real demand signal
  // (route_score, or airline_count as a proxy for how busy the route is).
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
    airportCodes: city.airport_codes || [],
    airportCount: (city.airport_codes || []).length,
    destinationCount,
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

// Build the FAQ item list ({question, answer} plain text) for a city. Every
// item is gated on the data that backs it — an item is only emitted when its
// answer can be stated truthfully from the computed facts.
function buildCityFaqItems(facts, cityName, countryName, lang) {
  const items = [];
  const sep = listSep(lang);

  if (facts.airportCount > 0) {
    const codes = facts.airportCodes.join(sep);
    const key = facts.airportCount === 1 ? 'cityFaqAirportsAnswerSingle' : 'cityFaqAirportsAnswerMulti';
    items.push({
      question: format(translate('cityFaqAirportsQuestion', lang), { city: cityName }),
      answer: format(translate(key, lang), { city: cityName, count: facts.airportCount, codes }),
    });
  }

  if (facts.destinationCount > 0) {
    items.push({
      question: format(translate('cityFaqDestinationsQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqDestinationsAnswer', lang), {
        city: cityName,
        count: nfmt(facts.destinationCount, lang),
      }),
    });
  }

  if (facts.countryCount > 0) {
    items.push({
      question: format(translate('cityFaqCountriesQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqCountriesAnswer', lang), {
        city: cityName,
        count: facts.countryCount,
        countries: facts.countries.map((c) => c.name).join(sep),
      }),
    });
  }

  if (facts.internationalCount > 0) {
    items.push({
      question: format(translate('cityFaqInternationalQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqInternationalAnswer', lang), {
        city: cityName,
        count: nfmt(facts.internationalCount, lang),
        countryCount: facts.countryCount,
      }),
    });
  }

  if (facts.domesticCount > 0 && countryName) {
    items.push({
      question: format(translate('cityFaqDomesticQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqDomesticAnswer', lang), {
        city: cityName,
        count: nfmt(facts.domesticCount, lang),
        country: countryName,
      }),
    });
  }

  if (facts.popularDestination) {
    items.push({
      question: format(translate('cityFaqPopularQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqPopularAnswer', lang), {
        city: cityName,
        destination: facts.popularDestination.name,
      }),
    });
  }

  if (facts.topDestinations.length >= 3) {
    const names = facts.topDestinations.slice(0, 5).map((d) => d.name).join(sep);
    items.push({
      question: format(translate('cityFaqTopDestinationsQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqTopDestinationsAnswer', lang), { city: cityName, destinations: names }),
    });
  }

  if (facts.distances) {
    items.push({
      question: format(translate('cityFaqLongestQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqLongestAnswer', lang), {
        city: cityName,
        destination: facts.distances.longest.name,
        distance: nfmt(facts.distances.longest.km, lang),
      }),
    });
    items.push({
      question: format(translate('cityFaqShortestQuestion', lang), { city: cityName }),
      answer: format(translate('cityFaqShortestAnswer', lang), {
        city: cityName,
        destination: facts.distances.shortest.name,
        distance: nfmt(facts.distances.shortest.km, lang),
      }),
    });
  }

  return items;
}

module.exports = { buildRouteMetaMap, computeCityFacts, buildCityFaqItems, nfmt };
