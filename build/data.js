// Shared name/translation data for the page generator, ported verbatim from
// the per-language logic that used to be duplicated across city.html/
// city-en.html/country.html/country-en.html/airport.html/airport-en.html/
// flight-route.html/flight-route-en.html.

const GERMAN_CITY_NAMES = {
  BER: 'Berlin', MUC: 'München', FRA: 'Frankfurt', HAM: 'Hamburg', DUS: 'Düsseldorf',
  CGN: 'Köln', STR: 'Stuttgart', HAJ: 'Hannover', LEJ: 'Leipzig', NUE: 'Nürnberg',
  DTM: 'Dortmund', BRE: 'Bremen', VIE: 'Wien', ZRH: 'Zürich', GVA: 'Genf',
  LHR: 'London', LGW: 'London', STN: 'London', LTN: 'London', CDG: 'Paris', ORY: 'Paris',
  FCO: 'Rom', CIA: 'Rom', MXP: 'Mailand', LIN: 'Mailand', VCE: 'Venedig', NAP: 'Neapel',
  MAD: 'Madrid', BCN: 'Barcelona', VLC: 'Valencia', SVQ: 'Sevilla', AGP: 'Málaga',
  LIS: 'Lissabon', OPO: 'Porto', AMS: 'Amsterdam', BRU: 'Brüssel', LUX: 'Luxemburg',
  CPH: 'Kopenhagen', OSL: 'Oslo', ARN: 'Stockholm', HEL: 'Helsinki', DUB: 'Dublin',
  WAW: 'Warschau', KRK: 'Krakau', PRG: 'Prag', BUD: 'Budapest', ATH: 'Athen',
  IST: 'Istanbul', SAW: 'Istanbul', CAI: 'Kairo', DXB: 'Dubai', DOH: 'Doha',
  BKK: 'Bangkok', SIN: 'Singapur', HKG: 'Hongkong', NRT: 'Tokio', HND: 'Tokio',
  JFK: 'New York', EWR: 'New York', LAX: 'Los Angeles', SFO: 'San Francisco',
  MIA: 'Miami', YYZ: 'Toronto', GRU: 'São Paulo', CPT: 'Kapstadt', JNB: 'Johannesburg',
  SYD: 'Sydney', MEL: 'Melbourne', DBV: 'Dubrovnik', SPU: 'Split', ZAG: 'Zagreb',
};

const ENGLISH_CITY_NAMES = {
  BER: 'Berlin', MUC: 'Munich', FRA: 'Frankfurt', HAM: 'Hamburg', DUS: 'Dusseldorf',
  CGN: 'Cologne', STR: 'Stuttgart', HAJ: 'Hanover', LEJ: 'Leipzig', NUE: 'Nuremberg',
  DTM: 'Dortmund', BRE: 'Bremen', VIE: 'Vienna', ZRH: 'Zurich', GVA: 'Geneva',
  LHR: 'London', LGW: 'London', STN: 'London', LTN: 'London', CDG: 'Paris', ORY: 'Paris',
  FCO: 'Rome', CIA: 'Rome', MXP: 'Milan', LIN: 'Milan', VCE: 'Venice', NAP: 'Naples',
  MAD: 'Madrid', BCN: 'Barcelona', VLC: 'Valencia', SVQ: 'Seville', AGP: 'Malaga',
  LIS: 'Lisbon', OPO: 'Porto', AMS: 'Amsterdam', BRU: 'Brussels', LUX: 'Luxembourg',
  CPH: 'Copenhagen', OSL: 'Oslo', ARN: 'Stockholm', HEL: 'Helsinki', DUB: 'Dublin',
  WAW: 'Warsaw', KRK: 'Krakow', PRG: 'Prague', BUD: 'Budapest', ATH: 'Athens',
  IST: 'Istanbul', SAW: 'Istanbul', CAI: 'Cairo', DXB: 'Dubai', DOH: 'Doha',
  BKK: 'Bangkok', SIN: 'Singapore', HKG: 'Hong Kong', NRT: 'Tokyo', HND: 'Tokyo',
  JFK: 'New York', EWR: 'New York', LAX: 'Los Angeles', SFO: 'San Francisco',
  MIA: 'Miami', YYZ: 'Toronto', GRU: 'São Paulo', CPT: 'Cape Town', JNB: 'Johannesburg',
  SYD: 'Sydney', MEL: 'Melbourne', DBV: 'Dubrovnik', SPU: 'Split', ZAG: 'Zagreb',
};

const ENGLISH_COUNTRY_NAMES = {
  DE: 'Germany', AT: 'Austria', CH: 'Switzerland', GB: 'United Kingdom',
  FR: 'France', IT: 'Italy', ES: 'Spain', PT: 'Portugal', NL: 'Netherlands',
  BE: 'Belgium', LU: 'Luxembourg', DK: 'Denmark', NO: 'Norway', SE: 'Sweden',
  FI: 'Finland', IE: 'Ireland', PL: 'Poland', CZ: 'Czech Republic', HU: 'Hungary',
  GR: 'Greece', TR: 'Turkey', EG: 'Egypt', AE: 'United Arab Emirates', QA: 'Qatar',
  TH: 'Thailand', SG: 'Singapore', HK: 'Hong Kong', JP: 'Japan', US: 'United States',
  CA: 'Canada', BR: 'Brazil', ZA: 'South Africa', AU: 'Australia', HR: 'Croatia',
};

function germanizeCity(name, iata) {
  return (iata && GERMAN_CITY_NAMES[iata]) || name;
}
function anglicizeCity(name, iata) {
  return (iata && ENGLISH_CITY_NAMES[iata]) || name;
}
function anglicizeCountry(name, code) {
  return (code && ENGLISH_COUNTRY_NAMES[code]) || name;
}
function localizeCity(name, iata, lang) {
  return lang === 'en' ? anglicizeCity(name, iata) : germanizeCity(name, iata);
}
function localizeCountry(name, code, lang) {
  return lang === 'en' ? anglicizeCountry(name, code) : name;
}

// [ALTERNATIVE-AIRPORTS] real groupings derived from the trusted IATA->city
// maps above (cities served by more than one mapped airport).
function buildCityAirports(namesByIata) {
  const map = {};
  Object.keys(namesByIata).forEach((code) => {
    const city = namesByIata[code];
    if (!map[city]) map[city] = [];
    map[city].push(code);
  });
  return map;
}
const CITY_AIRPORTS_DE = buildCityAirports(GERMAN_CITY_NAMES);
const CITY_AIRPORTS_EN = buildCityAirports(ENGLISH_CITY_NAMES);
function getAlternativeAirports(cityName, excludeIata, lang) {
  const table = lang === 'en' ? CITY_AIRPORTS_EN : CITY_AIRPORTS_DE;
  const list = table[cityName] || [];
  return list.filter((c) => c !== excludeIata);
}

// [CONTEXT-DETECTION] known cities/countries for the blog "popular routes"/
// "similar posts" matching — ported verbatim from blog-post.html/-en.html.
const KNOWN_CITIES = ['Berlin', 'München', 'Munich', 'Frankfurt', 'Hamburg', 'Düsseldorf', 'Cologne', 'Köln', 'Stuttgart', 'Hannover', 'Leipzig', 'Nürnberg', 'Nuremberg', 'Dortmund', 'Bremen', 'Wien', 'Vienna', 'Zürich', 'Zurich', 'Genf', 'Geneva', 'London', 'Paris', 'Rom', 'Rome', 'Mailand', 'Milan', 'Venedig', 'Venice', 'Neapel', 'Naples', 'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Seville', 'Malaga', 'Lissabon', 'Lisbon', 'Porto', 'Amsterdam', 'Brüssel', 'Brussels', 'Luxemburg', 'Luxembourg', 'Kopenhagen', 'Copenhagen', 'Oslo', 'Stockholm', 'Helsinki', 'Dublin', 'Warschau', 'Warsaw', 'Krakau', 'Krakow', 'Prag', 'Prague', 'Budapest', 'Athen', 'Athens', 'Istanbul', 'Kairo', 'Cairo', 'Dubai', 'Doha', 'Bangkok', 'Singapur', 'Singapore', 'Hongkong', 'Hong Kong', 'Tokio', 'Tokyo', 'New York', 'Los Angeles', 'San Francisco', 'Miami', 'Toronto', 'São Paulo', 'Kapstadt', 'Cape Town', 'Johannesburg', 'Sydney', 'Melbourne', 'Dubrovnik', 'Split', 'Zagreb'];

const CITY_COUNTRY_DE = {
  Berlin: 'Deutschland', München: 'Deutschland', Munich: 'Deutschland', Frankfurt: 'Deutschland', Hamburg: 'Deutschland', Düsseldorf: 'Deutschland', Cologne: 'Deutschland', Köln: 'Deutschland', Stuttgart: 'Deutschland', Hannover: 'Deutschland', Leipzig: 'Deutschland', Nürnberg: 'Deutschland', Nuremberg: 'Deutschland', Dortmund: 'Deutschland', Bremen: 'Deutschland',
  Wien: 'Österreich', Vienna: 'Österreich',
  Zürich: 'Schweiz', Zurich: 'Schweiz', Genf: 'Schweiz', Geneva: 'Schweiz',
  London: 'Vereinigtes Königreich',
  Paris: 'Frankreich',
  Rom: 'Italien', Rome: 'Italien', Mailand: 'Italien', Milan: 'Italien', Venedig: 'Italien', Venice: 'Italien', Neapel: 'Italien', Naples: 'Italien',
  Madrid: 'Spanien', Barcelona: 'Spanien', Valencia: 'Spanien', Sevilla: 'Spanien', Seville: 'Spanien', Malaga: 'Spanien',
  Lissabon: 'Portugal', Lisbon: 'Portugal', Porto: 'Portugal',
  Amsterdam: 'Niederlande',
  Brüssel: 'Belgien', Brussels: 'Belgien',
  Luxemburg: 'Luxemburg', Luxembourg: 'Luxemburg',
  Kopenhagen: 'Dänemark', Copenhagen: 'Dänemark',
  Oslo: 'Norwegen', Stockholm: 'Schweden', Helsinki: 'Finnland', Dublin: 'Irland',
  Warschau: 'Polen', Warsaw: 'Polen', Krakau: 'Polen', Krakow: 'Polen',
  Prag: 'Tschechien', Prague: 'Tschechien', Budapest: 'Ungarn', Athen: 'Griechenland', Athens: 'Griechenland',
  Istanbul: 'Türkei', Kairo: 'Ägypten', Cairo: 'Ägypten', Dubai: 'VAE', Doha: 'Katar',
  Bangkok: 'Thailand', Singapur: 'Singapur', Singapore: 'Singapur', Hongkong: 'Hongkong', 'Hong Kong': 'Hongkong', Tokio: 'Japan', Tokyo: 'Japan',
  'New York': 'USA', 'Los Angeles': 'USA', 'San Francisco': 'USA', Miami: 'USA',
  Toronto: 'Kanada', 'São Paulo': 'Brasilien', Kapstadt: 'Südafrika', 'Cape Town': 'Südafrika', Johannesburg: 'Südafrika',
  Sydney: 'Australien', Melbourne: 'Australien', Dubrovnik: 'Kroatien', Split: 'Kroatien', Zagreb: 'Kroatien',
};

const CITY_COUNTRY_EN = {
  Berlin: 'Germany', München: 'Germany', Munich: 'Germany', Frankfurt: 'Germany', Hamburg: 'Germany', Düsseldorf: 'Germany', Cologne: 'Germany', Köln: 'Germany', Stuttgart: 'Germany', Hannover: 'Germany', Leipzig: 'Germany', Nürnberg: 'Germany', Nuremberg: 'Germany', Dortmund: 'Germany', Bremen: 'Germany',
  Wien: 'Austria', Vienna: 'Austria',
  Zürich: 'Switzerland', Zurich: 'Switzerland', Genf: 'Switzerland', Geneva: 'Switzerland',
  London: 'United Kingdom',
  Paris: 'France',
  Rom: 'Italy', Rome: 'Italy', Mailand: 'Italy', Milan: 'Italy', Venedig: 'Italy', Venice: 'Italy', Neapel: 'Italy', Naples: 'Italy',
  Madrid: 'Spain', Barcelona: 'Spain', Valencia: 'Spain', Sevilla: 'Spain', Seville: 'Spain', Malaga: 'Spain',
  Lissabon: 'Portugal', Lisbon: 'Portugal', Porto: 'Portugal',
  Amsterdam: 'Netherlands',
  Brüssel: 'Belgium', Brussels: 'Belgium',
  Luxemburg: 'Luxembourg', Luxembourg: 'Luxembourg',
  Kopenhagen: 'Denmark', Copenhagen: 'Denmark',
  Oslo: 'Norway', Stockholm: 'Sweden', Helsinki: 'Finland', Dublin: 'Ireland',
  Warschau: 'Poland', Warsaw: 'Poland', Krakau: 'Poland', Krakow: 'Poland',
  Prag: 'Czech Republic', Prague: 'Czech Republic', Budapest: 'Hungary', Athen: 'Greece', Athens: 'Greece',
  Istanbul: 'Turkey', Kairo: 'Egypt', Cairo: 'Egypt', Dubai: 'VAE', Doha: 'Qatar',
  Bangkok: 'Thailand', Singapur: 'Singapore', Singapore: 'Singapore', Hongkong: 'Hong Kong', 'Hong Kong': 'Hong Kong', Tokio: 'Japan', Tokyo: 'Japan',
  'New York': 'USA', 'Los Angeles': 'USA', 'San Francisco': 'USA', Miami: 'USA',
  Toronto: 'Canada', 'São Paulo': 'Brazil', Kapstadt: 'South Africa', 'Cape Town': 'South Africa', Johannesburg: 'South Africa',
  Sydney: 'Australia', Melbourne: 'Australia', Dubrovnik: 'Croatia', Split: 'Croatia', Zagreb: 'Croatia',
};

function detectCitiesInText(text) {
  const found = [];
  KNOWN_CITIES.forEach((city) => {
    const re = new RegExp('(^|[^a-zA-ZäöüÄÖÜ])' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zA-ZäöüÄÖÜ]|$)', 'i');
    if (re.test(text)) found.push(city);
  });
  return found;
}
function citiesToCountries(cities, lang) {
  const table = lang === 'en' ? CITY_COUNTRY_EN : CITY_COUNTRY_DE;
  const set = {};
  cities.forEach((c) => { const co = table[c]; if (co) set[co] = true; });
  return Object.keys(set);
}

// i18n strings for nav/footer/labels — the only per-language differences in
// the shared page shell that aren't already data-driven above.
const STRINGS = {
  de: {
    homeHref: '/', homeLabel: 'Startseite', searchLabel: 'Flüge suchen',
    footerTagline: 'Finde Flüge, die sonst niemand findet. 600+ Airlines, beste Preise, volle Garantie.',
    companyLabel: 'Unternehmen', aboutLabel: 'Über uns', aboutHref: '/about.html', blogLabel: 'Blog', blogHref: '/blog.html',
    supportLabel: 'Support', contactLabel: 'Kontakt', contactHref: '/contact.html', privacyLabel: 'Datenschutz', privacyHref: '/privacy.html', termsLabel: 'AGB', termsHref: '/terms.html',
    copyright: '© 2026 Airpiv · Alle Rechte vorbehalten',
  },
  en: {
    homeHref: '/en/', homeLabel: 'Home', searchLabel: 'Search flights',
    footerTagline: 'Find flights no one else can find. 600+ airlines, best prices, full guarantee.',
    companyLabel: 'Company', aboutLabel: 'About us', aboutHref: '/about.html', blogLabel: 'Blog', blogHref: '/blog.html',
    supportLabel: 'Support', contactLabel: 'Contact', contactHref: '/contact.html', privacyLabel: 'Privacy', privacyHref: '/privacy.html', termsLabel: 'Terms', termsHref: '/terms.html',
    copyright: '© 2026 Airpiv · All rights reserved',
  },
};

module.exports = {
  GERMAN_CITY_NAMES, ENGLISH_CITY_NAMES, ENGLISH_COUNTRY_NAMES,
  germanizeCity, anglicizeCity, anglicizeCountry, localizeCity, localizeCountry,
  getAlternativeAirports,
  KNOWN_CITIES, detectCitiesInText, citiesToCountries,
  STRINGS,
};
