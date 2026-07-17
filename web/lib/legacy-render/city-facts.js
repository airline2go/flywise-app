// [CITY-SEO-CONTENT] Derives real, unique facts for a city page from the
// city's own routes joined against the full /route-pages metadata list
// (distance_km / haul_type / airline_count / route_score). The connection
// math is shared with the airport page — see connection-facts.js — so this
// module only knows how to turn a city's routes into a connection list and how
// to phrase the city FAQ. Everything is computed from live data; when a signal
// is missing for a given city, the dependent fact/question is omitted rather
// than guessed.
const { translate, format } = require('./translate');
const { pickVariant } = require('./content-variants');
const { nfmt, listSep, buildRouteMetaMap, summarizeConnections, variantKey } = require('./connection-facts');

// [ANTI-BOILERPLATE] The old city intro was one template string shared by
// every city that lacks an admin-authored intro_text — identical across
// thousands of pages except the swapped-in name. This builds a genuinely
// varied intro instead: the opening and closing sentences are each picked
// from several phrasings by a stable hash of the city slug (so a given city
// always reads the same, but different cities diverge), and the middle
// sentences weave in that city's real numbers (destinations, countries,
// most-popular route). Two different cities never read byte-identical, and
// nothing is invented — data-dependent clauses are omitted when the data is
// absent. Admin intro_text still wins outright.
function buildCityIntro(city, facts, cityName, lang) {
  const seed = city.city_slug || cityName;
  const openKeys = ['cityIntroOpenA', 'cityIntroOpenB'];
  if (facts.destinationCount > 0) openKeys.push('cityIntroOpenC');
  const openKey = openKeys[pickVariant(`${seed}:cintroOpen`, openKeys.length)];
  let s = format(translate(openKey, lang), { city: cityName, count: nfmt(facts.destinationCount, lang) });

  if (facts.destinationCount > 0 && facts.countryCount > 0) {
    s += format(translate('cityIntroData', lang), {
      city: cityName,
      count: nfmt(facts.destinationCount, lang),
      countryCount: nfmt(facts.countryCount, lang),
    });
  }
  if (facts.popularDestination) {
    s += format(translate('cityIntroPopular', lang), { city: cityName, destination: facts.popularDestination.name });
  }
  const closeKeys = ['cityIntroCloseA', 'cityIntroCloseB'];
  s += translate(closeKeys[pickVariant(`${seed}:cintroClose`, closeKeys.length)], lang);
  return s;
}

// Reduce a city's bidirectional route list to the connection shape the shared
// engine expects (the far endpoint of each route, plus that route's metadata).
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
  const summary = summarizeConnections(conns, city.country_code, lang);
  return {
    airportCodes: city.airport_codes || [],
    airportCount: (city.airport_codes || []).length,
    ...summary,
  };
}

// Build the FAQ item list ({question, answer} plain text) for a city. Every
// item is gated on the data that backs it — an item is only emitted when its
// answer can be stated truthfully from the computed facts.
function buildCityFaqItems(facts, cityName, countryName, lang, seed) {
  const items = [];
  const sep = listSep(lang);
  const s = seed || cityName;
  // Pick between an answer's two phrasings by a stable per-city/per-question
  // hash, so two cities never share identical FAQ answer wording.
  const av = (base) => translate(variantKey(base, `${s}:${base}`), lang);

  if (facts.airportCount > 0) {
    const codes = facts.airportCodes.join(sep);
    const key = facts.airportCount === 1 ? 'cityFaqAirportsAnswerSingle' : 'cityFaqAirportsAnswerMulti';
    items.push({
      question: format(translate('cityFaqAirportsQuestion', lang), { city: cityName }),
      answer: format(av(key), { city: cityName, count: facts.airportCount, codes }),
    });
  }

  if (facts.destinationCount > 0) {
    items.push({
      question: format(translate('cityFaqDestinationsQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqDestinationsAnswer'), {
        city: cityName,
        count: nfmt(facts.destinationCount, lang),
      }),
    });
  }

  if (facts.countryCount > 0) {
    items.push({
      question: format(translate('cityFaqCountriesQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqCountriesAnswer'), {
        city: cityName,
        count: facts.countryCount,
        countries: facts.countries.map((c) => c.name).join(sep),
      }),
    });
  }

  if (facts.internationalCount > 0) {
    items.push({
      question: format(translate('cityFaqInternationalQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqInternationalAnswer'), {
        city: cityName,
        count: nfmt(facts.internationalCount, lang),
        countryCount: facts.countryCount,
      }),
    });
  }

  if (facts.domesticCount > 0 && countryName) {
    items.push({
      question: format(translate('cityFaqDomesticQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqDomesticAnswer'), {
        city: cityName,
        count: nfmt(facts.domesticCount, lang),
        country: countryName,
      }),
    });
  }

  if (facts.popularDestination) {
    items.push({
      question: format(translate('cityFaqPopularQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqPopularAnswer'), {
        city: cityName,
        destination: facts.popularDestination.name,
      }),
    });
  }

  if (facts.topDestinations.length >= 3) {
    const names = facts.topDestinations.slice(0, 5).map((d) => d.name).join(sep);
    items.push({
      question: format(translate('cityFaqTopDestinationsQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqTopDestinationsAnswer'), { city: cityName, destinations: names }),
    });
  }

  if (facts.distances) {
    items.push({
      question: format(translate('cityFaqAvgDistanceQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqAvgDistanceAnswer'), {
        city: cityName,
        distance: nfmt(facts.distances.avg, lang),
      }),
    });
    items.push({
      question: format(translate('cityFaqLongestQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqLongestAnswer'), {
        city: cityName,
        destination: facts.distances.longest.name,
        distance: nfmt(facts.distances.longest.km, lang),
      }),
    });
    items.push({
      question: format(translate('cityFaqShortestQuestion', lang), { city: cityName }),
      answer: format(av('cityFaqShortestAnswer'), {
        city: cityName,
        destination: facts.distances.shortest.name,
        distance: nfmt(facts.distances.shortest.km, lang),
      }),
    });
  }

  return items;
}

// Re-export the shared helpers render-city.js / render.js import from here, so
// their existing import sites keep working after the extraction.
module.exports = { buildRouteMetaMap, computeCityFacts, buildCityFaqItems, buildCityIntro, nfmt };
