// [CITY-SEO-CONTENT] Derives real, unique facts for a city page from the
// city's own routes joined against the full /route-pages metadata list
// (distance_km / haul_type / airline_count / route_score). The connection
// math is shared with the airport page — see connection-facts.js — so this
// module only knows how to turn a city's routes into a connection list and how
// to phrase the city FAQ. Everything is computed from live data; when a signal
// is missing for a given city, the dependent fact/question is omitted rather
// than guessed.
const { translate, format } = require('./translate');
const { nfmt, listSep, buildRouteMetaMap, summarizeConnections } = require('./connection-facts');

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

// Re-export the shared helpers render-city.js / render.js import from here, so
// their existing import sites keep working after the extraction.
module.exports = { buildRouteMetaMap, computeCityFacts, buildCityFaqItems, nfmt };
