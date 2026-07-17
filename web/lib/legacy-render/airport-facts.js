// [AIRPORT-SEO-CONTENT] Same connection engine as the city page (see
// connection-facts.js), keyed on the airport's IATA code instead of a city
// slug, plus the airport-specific "alternative airports serving the same city"
// fact. Produces the airport page's stats and a data-gated FAQ; any question
// whose backing data is missing for a given airport is omitted, never guessed.
const { getAlternativeAirports } = require('./data');
const { translate, format } = require('./translate');
const { nfmt, listSep, summarizeConnections } = require('./connection-facts');

function computeAirportFacts(airport, routes, routeMetaBySlug, lang) {
  const code = airport.code;
  const meta = routeMetaBySlug || {};
  const conns = (routes || []).map((r) => {
    const isOrigin = r.origin_iata === code;
    return {
      slug: r.slug,
      otherCitySlug: isOrigin ? r.destination_city_slug : r.origin_city_slug,
      otherCityRaw: isOrigin ? r.destination_city : r.origin_city,
      otherIata: isOrigin ? r.destination_iata : r.origin_iata,
      otherCountry: isOrigin ? r.destination_country : r.origin_country,
      m: meta[r.slug] || {},
    };
  });
  const summary = summarizeConnections(conns, airport.country, lang);
  // Sibling airports serving the same city (real, from the city's own
  // airport_codes list) — empty for single-airport cities.
  const alternativeAirports = getAlternativeAirports(airport.city, code, lang);
  return { ...summary, alternativeAirports };
}

// Build the airport FAQ item list ({question, answer} plain text), each item
// gated on the data that backs it.
function buildAirportFaqItems(facts, code, cityName, countryName, lang) {
  const items = [];
  const sep = listSep(lang);

  if (cityName) {
    const key = countryName ? 'airportFaqCityAnswer' : 'airportFaqCityAnswerNoCountry';
    items.push({
      question: format(translate('airportFaqCityQuestion', lang), { code }),
      answer: format(translate(key, lang), { code, city: cityName, country: countryName }),
    });
  }

  if (facts.destinationCount > 0) {
    items.push({
      question: format(translate('airportFaqDestinationsQuestion', lang), { code }),
      answer: format(translate('airportFaqDestinationsAnswer', lang), { code, count: nfmt(facts.destinationCount, lang) }),
    });
  }

  if (facts.countryCount > 0) {
    items.push({
      question: format(translate('airportFaqCountriesQuestion', lang), { code }),
      answer: format(translate('airportFaqCountriesAnswer', lang), {
        code,
        count: facts.countryCount,
        countries: facts.countries.map((c) => c.name).join(sep),
      }),
    });
  }

  if (facts.internationalCount > 0) {
    items.push({
      question: format(translate('airportFaqInternationalQuestion', lang), { code }),
      answer: format(translate('airportFaqInternationalAnswer', lang), {
        code,
        count: nfmt(facts.internationalCount, lang),
        countryCount: facts.countryCount,
      }),
    });
  }

  if (facts.domesticCount > 0 && countryName) {
    items.push({
      question: format(translate('airportFaqDomesticQuestion', lang), { code }),
      answer: format(translate('airportFaqDomesticAnswer', lang), {
        code,
        count: nfmt(facts.domesticCount, lang),
        country: countryName,
      }),
    });
  }

  if (facts.popularDestination) {
    items.push({
      question: format(translate('airportFaqPopularQuestion', lang), { code }),
      answer: format(translate('airportFaqPopularAnswer', lang), { code, destination: facts.popularDestination.name }),
    });
  }

  if (facts.topDestinations.length >= 3) {
    const names = facts.topDestinations.slice(0, 5).map((d) => d.name).join(sep);
    items.push({
      question: format(translate('airportFaqTopDestinationsQuestion', lang), { code }),
      answer: format(translate('airportFaqTopDestinationsAnswer', lang), { code, destinations: names }),
    });
  }

  if (facts.alternativeAirports && facts.alternativeAirports.length && cityName) {
    items.push({
      question: format(translate('airportFaqAlternativesQuestion', lang), { city: cityName }),
      answer: format(translate('airportFaqAlternativesAnswer', lang), {
        city: cityName,
        airports: facts.alternativeAirports.join(sep),
      }),
    });
  }

  if (facts.distances) {
    items.push({
      question: format(translate('airportFaqLongestQuestion', lang), { code }),
      answer: format(translate('airportFaqLongestAnswer', lang), {
        code,
        destination: facts.distances.longest.name,
        distance: nfmt(facts.distances.longest.km, lang),
      }),
    });
    items.push({
      question: format(translate('airportFaqShortestQuestion', lang), { code }),
      answer: format(translate('airportFaqShortestAnswer', lang), {
        code,
        destination: facts.distances.shortest.name,
        distance: nfmt(facts.distances.shortest.km, lang),
      }),
    });
  }

  return items;
}

module.exports = { computeAirportFacts, buildAirportFaqItems };
