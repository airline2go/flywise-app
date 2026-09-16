const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('./languages');

// Loaded once at module init. Static require() (rather than the build
// script's fs.readFileSync) so the bundler traces and includes each JSON in
// the serverless output — the values, and therefore the rendered HTML, are
// byte-for-byte the same as the build-time renderer's.
const DICTS = {
  en: require('../../translations/en.json'),
  de: require('../../translations/de.json'),
  ar: require('../../translations/ar.json'),
  es: require('../../translations/es.json'),
  fr: require('../../translations/fr.json'),
  it: require('../../translations/it.json'),
  nl: require('../../translations/nl.json'),
  tr: require('../../translations/tr.json'),
};
// Guard: keep the DICTS map in lock-step with the canonical language list.
LANGUAGE_CODES.forEach((code) => {
  if (!DICTS[code]) throw new Error(`legacy-render/translate: missing translations for "${code}"`);
});

// [SEO-ROUTE-TEMPLATES] Route pages target a very explicit search intent:
// users want flights FROM one city TO another and want to compare fares and
// airlines. Keep the primary query terms near the beginning of title/description
// and avoid promising "book" functionality on a page whose primary CTA is
// flight search/comparison. These are localized per language rather than
// translating only the surrounding chrome.
const ROUTE_SEO_TEMPLATES = {
  en: {
    routeTitleTemplate: 'Cheap flights from {origin} to {destination} | Compare prices & airlines',
    routeDescriptionTemplate: 'Compare cheap flights from {origin} ({originCode}) to {destination} ({destCode}). See airlines, flight times and available fares with Airpiv.',
  },
  de: {
    routeTitleTemplate: 'Günstige Flüge von {origin} nach {destination} | Preise & Airlines vergleichen',
    routeDescriptionTemplate: 'Vergleiche günstige Flüge von {origin} ({originCode}) nach {destination} ({destCode}). Sieh Airlines, Flugzeiten und verfügbare Preise mit Airpiv.',
  },
  ar: {
    routeTitleTemplate: 'رحلات طيران رخيصة من {origin} إلى {destination} | قارن الأسعار وشركات الطيران',
    routeDescriptionTemplate: 'قارن الرحلات الرخيصة من {origin} ({originCode}) إلى {destination} ({destCode}). شاهد شركات الطيران وأوقات الرحلات والأسعار المتاحة عبر Airpiv.',
  },
  es: {
    routeTitleTemplate: 'Vuelos baratos de {origin} a {destination} | Compara precios y aerolíneas',
    routeDescriptionTemplate: 'Compara vuelos baratos de {origin} ({originCode}) a {destination} ({destCode}). Consulta aerolíneas, duración y precios disponibles con Airpiv.',
  },
  fr: {
    routeTitleTemplate: 'Vols pas chers de {origin} à {destination} | Comparez prix et compagnies',
    routeDescriptionTemplate: 'Comparez les vols pas chers de {origin} ({originCode}) à {destination} ({destCode}). Consultez les compagnies, durées de vol et tarifs disponibles avec Airpiv.',
  },
  it: {
    routeTitleTemplate: 'Voli economici da {origin} a {destination} | Confronta prezzi e compagnie',
    routeDescriptionTemplate: 'Confronta voli economici da {origin} ({originCode}) a {destination} ({destCode}). Scopri compagnie, durata del volo e tariffe disponibili con Airpiv.',
  },
  nl: {
    routeTitleTemplate: 'Goedkope vluchten van {origin} naar {destination} | Vergelijk prijzen en airlines',
    routeDescriptionTemplate: 'Vergelijk goedkope vluchten van {origin} ({originCode}) naar {destination} ({destCode}). Bekijk airlines, vliegtijden en beschikbare prijzen met Airpiv.',
  },
  tr: {
    routeTitleTemplate: '{origin} - {destination} ucuz uçuşlar | Fiyatları ve havayollarını karşılaştır',
    routeDescriptionTemplate: '{origin} ({originCode}) - {destination} ({destCode}) ucuz uçuşları karşılaştırın. Havayollarını, uçuş sürelerini ve mevcut fiyatları Airpiv ile görün.',
  },
};

// [ROUTE-TRUTHFULNESS] The legacy route renderer contains a "best time to book"
// section. It is not backed by a route-specific historical booking-window model;
// haul type alone cannot establish a statistically supported booking window.
// Keep the section useful but neutral until such a signal exists. This prevents
// SEO copy from turning a generic heuristic into a factual route claim.
const ROUTE_PLANNING_SAFE_COPY = {
  en: {
    routeBestTimeHeading: 'Flight planning information',
    routeBestTimeBookingWindowLabel: 'Booking window',
    routeBestTimeWindowLongHaul: 'Not available from current route data',
    routeBestTimeWindowShortHaul: 'Not available from current route data',
    routeBestTimeBodyLongHaul: 'For flights from {origin} to {destination}, current route data does not establish a reliable booking window.',
    routeBestTimeBodyShortHaul: 'For flights from {origin} to {destination}, current route data does not establish a reliable booking window.',
    routeBestTimeBodyMediumHaul: 'For flights from {origin} to {destination}, current route data does not establish a reliable booking window.',
    routeBestTimeBodyDomesticLongHaul: 'For flights from {origin} to {destination}, current route data does not establish a reliable booking window.',
    routeBestTimeBodyDomesticShortHaul: 'For flights from {origin} to {destination}, current route data does not establish a reliable booking window.',
    routeBestTimeTipDirect: 'Use the current route results to compare available direct options.',
    routeBestTimeTipConnecting: 'Use the current route results to compare connecting options.',
    routeBestTimeTipMixed: 'Use the current route results to compare direct and connecting options.',
    routeBestTimeClosingV1: 'Availability and fares can vary by travel date.',
    routeBestTimeClosingV2: 'Check the current search results for the dates you plan to travel.',
    routeFaqBestTimeQuestion: 'How should I plan flights from {origin} to {destination}?',
    routeFaqBestTimeAnswerLongHaul: 'Current route data does not establish a reliable booking window. Compare the available options for your intended travel dates.',
    routeFaqBestTimeAnswerMediumHaul: 'Current route data does not establish a reliable booking window. Compare the available options for your intended travel dates.',
    routeFaqBestTimeAnswerShortHaul: 'Current route data does not establish a reliable booking window. Compare the available options for your intended travel dates.',
  },
  de: {
    routeBestTimeHeading: 'Informationen zur Flugplanung', routeBestTimeBookingWindowLabel: 'Buchungszeitraum',
    routeBestTimeWindowLongHaul: 'Aus den aktuellen Streckendaten nicht ableitbar', routeBestTimeWindowShortHaul: 'Aus den aktuellen Streckendaten nicht ableitbar',
    routeBestTimeBodyLongHaul: 'Für Flüge von {origin} nach {destination} lässt sich aus den aktuellen Streckendaten kein verlässlicher Buchungszeitraum ableiten.', routeBestTimeBodyShortHaul: 'Für Flüge von {origin} nach {destination} lässt sich aus den aktuellen Streckendaten kein verlässlicher Buchungszeitraum ableiten.', routeBestTimeBodyMediumHaul: 'Für Flüge von {origin} nach {destination} lässt sich aus den aktuellen Streckendaten kein verlässlicher Buchungszeitraum ableiten.', routeBestTimeBodyDomesticLongHaul: 'Für Flüge von {origin} nach {destination} lässt sich aus den aktuellen Streckendaten kein verlässlicher Buchungszeitraum ableiten.', routeBestTimeBodyDomesticShortHaul: 'Für Flüge von {origin} nach {destination} lässt sich aus den aktuellen Streckendaten kein verlässlicher Buchungszeitraum ableiten.',
    routeBestTimeTipDirect: 'Vergleiche die aktuell verfügbaren Direktverbindungen.', routeBestTimeTipConnecting: 'Vergleiche die aktuell verfügbaren Umsteigeverbindungen.', routeBestTimeTipMixed: 'Vergleiche die aktuell verfügbaren Direkt- und Umsteigeverbindungen.',
    routeBestTimeClosingV1: 'Verfügbarkeit und Preise können je nach Reisedatum variieren.', routeBestTimeClosingV2: 'Prüfe die aktuellen Suchergebnisse für deine geplanten Reisedaten.',
    routeFaqBestTimeQuestion: 'Wie lässt sich ein Flug von {origin} nach {destination} planen?', routeFaqBestTimeAnswerLongHaul: 'Aus den aktuellen Streckendaten lässt sich kein verlässlicher Buchungszeitraum ableiten. Vergleiche die verfügbaren Optionen für dein Reisedatum.', routeFaqBestTimeAnswerMediumHaul: 'Aus den aktuellen Streckendaten lässt sich kein verlässlicher Buchungszeitraum ableiten. Vergleiche die verfügbaren Optionen für dein Reisedatum.', routeFaqBestTimeAnswerShortHaul: 'Aus den aktuellen Streckendaten lässt sich kein verlässlicher Buchungszeitraum ableiten. Vergleiche die verfügbaren Optionen für dein Reisedatum.',
  },
  ar: {
    routeBestTimeHeading: 'معلومات تخطيط الرحلة', routeBestTimeBookingWindowLabel: 'فترة الحجز', routeBestTimeWindowLongHaul: 'لا يمكن تحديدها من بيانات المسار الحالية', routeBestTimeWindowShortHaul: 'لا يمكن تحديدها من بيانات المسار الحالية',
    routeBestTimeBodyLongHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة للرحلات من {origin} إلى {destination}.', routeBestTimeBodyShortHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة للرحلات من {origin} إلى {destination}.', routeBestTimeBodyMediumHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة للرحلات من {origin} إلى {destination}.', routeBestTimeBodyDomesticLongHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة للرحلات من {origin} إلى {destination}.', routeBestTimeBodyDomesticShortHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة للرحلات من {origin} إلى {destination}.',
    routeBestTimeTipDirect: 'استخدم نتائج المسار الحالية لمقارنة الرحلات المباشرة المتاحة.', routeBestTimeTipConnecting: 'استخدم نتائج المسار الحالية لمقارنة الرحلات المتاحة مع التوقف.', routeBestTimeTipMixed: 'استخدم نتائج المسار الحالية لمقارنة الرحلات المباشرة ورحلات التوقف.', routeBestTimeClosingV1: 'قد يختلف التوفر والأسعار حسب تاريخ السفر.', routeBestTimeClosingV2: 'تحقق من نتائج البحث الحالية لتواريخ سفرك.',
    routeFaqBestTimeQuestion: 'كيف يمكن التخطيط لرحلة من {origin} إلى {destination}؟', routeFaqBestTimeAnswerLongHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة. قارن الخيارات المتاحة لتاريخ سفرك.', routeFaqBestTimeAnswerMediumHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة. قارن الخيارات المتاحة لتاريخ سفرك.', routeFaqBestTimeAnswerShortHaul: 'لا تحدد بيانات المسار الحالية فترة حجز موثوقة. قارن الخيارات المتاحة لتاريخ سفرك.',
  },
  es: {
    routeBestTimeHeading: 'Información para planificar el vuelo', routeBestTimeBookingWindowLabel: 'Ventana de reserva', routeBestTimeWindowLongHaul: 'No disponible con los datos actuales de la ruta', routeBestTimeWindowShortHaul: 'No disponible con los datos actuales de la ruta',
    routeBestTimeBodyLongHaul: 'Los datos actuales de la ruta no establecen una ventana de reserva fiable para vuelos de {origin} a {destination}.', routeBestTimeBodyShortHaul: 'Los datos actuales de la ruta no establecen una ventana de reserva fiable para vuelos de {origin} a {destination}.', routeBestTimeBodyMediumHaul: 'Los datos actuales de la ruta no establecen una ventana de reserva fiable para vuelos de {origin} a {destination}.', routeBestTimeBodyDomesticLongHaul: 'Los datos actuales de la ruta no establecen una ventana de reserva fiable para vuelos de {origin} a {destination}.', routeBestTimeBodyDomesticShortHaul: 'Los datos actuales de la ruta no establecen una ventana de reserva fiable para vuelos de {origin} a {destination}.',
    routeBestTimeTipDirect: 'Usa los resultados actuales para comparar las opciones directas disponibles.', routeBestTimeTipConnecting: 'Usa los resultados actuales para comparar las opciones con escalas.', routeBestTimeTipMixed: 'Usa los resultados actuales para comparar opciones directas y con escalas.', routeBestTimeClosingV1: 'La disponibilidad y los precios pueden variar según la fecha.', routeBestTimeClosingV2: 'Consulta los resultados actuales para las fechas que planeas viajar.', routeFaqBestTimeQuestion: '¿Cómo puedo planificar un vuelo de {origin} a {destination}?', routeFaqBestTimeAnswerLongHaul: 'Los datos actuales no establecen una ventana de reserva fiable. Compara las opciones disponibles para tus fechas.', routeFaqBestTimeAnswerMediumHaul: 'Los datos actuales no establecen una ventana de reserva fiable. Compara las opciones disponibles para tus fechas.', routeFaqBestTimeAnswerShortHaul: 'Los datos actuales no establecen una ventana de reserva fiable. Compara las opciones disponibles para tus fechas.',
  },
  fr: {
    routeBestTimeHeading: 'Informations pour planifier le vol', routeBestTimeBookingWindowLabel: 'Fenêtre de réservation', routeBestTimeWindowLongHaul: 'Non disponible avec les données actuelles de la route', routeBestTimeWindowShortHaul: 'Non disponible avec les données actuelles de la route',
    routeBestTimeBodyLongHaul: 'Les données actuelles de la route ne permettent pas d’établir une fenêtre de réservation fiable pour les vols de {origin} à {destination}.', routeBestTimeBodyShortHaul: 'Les données actuelles de la route ne permettent pas d’établir une fenêtre de réservation fiable pour les vols de {origin} à {destination}.', routeBestTimeBodyMediumHaul: 'Les données actuelles de la route ne permettent pas d’établir une fenêtre de réservation fiable pour les vols de {origin} à {destination}.', routeBestTimeBodyDomesticLongHaul: 'Les données actuelles de la route ne permettent pas d’établir une fenêtre de réservation fiable pour les vols de {origin} à {destination}.', routeBestTimeBodyDomesticShortHaul: 'Les données actuelles de la route ne permettent pas d’établir une fenêtre de réservation fiable pour les vols de {origin} à {destination}.',
    routeBestTimeTipDirect: 'Utilisez les résultats actuels pour comparer les options directes disponibles.', routeBestTimeTipConnecting: 'Utilisez les résultats actuels pour comparer les options avec escale.', routeBestTimeTipMixed: 'Utilisez les résultats actuels pour comparer les options directes et avec escale.', routeBestTimeClosingV1: 'Les disponibilités et les tarifs peuvent varier selon la date.', routeBestTimeClosingV2: 'Consultez les résultats actuels pour vos dates de voyage.', routeFaqBestTimeQuestion: 'Comment planifier un vol de {origin} à {destination} ?', routeFaqBestTimeAnswerLongHaul: 'Les données actuelles ne permettent pas d’établir une fenêtre de réservation fiable. Comparez les options disponibles pour vos dates.', routeFaqBestTimeAnswerMediumHaul: 'Les données actuelles ne permettent pas d’établir une fenêtre de réservation fiable. Comparez les options disponibles pour vos dates.', routeFaqBestTimeAnswerShortHaul: 'Les données actuelles ne permettent pas d’établir une fenêtre de réservation fiable. Comparez les options disponibles pour vos dates.',
  },
  it: {
    routeBestTimeHeading: 'Informazioni per pianificare il volo', routeBestTimeBookingWindowLabel: 'Finestra di prenotazione', routeBestTimeWindowLongHaul: 'Non disponibile con i dati attuali della rotta', routeBestTimeWindowShortHaul: 'Non disponibile con i dati attuali della rotta',
    routeBestTimeBodyLongHaul: 'I dati attuali della rotta non stabiliscono una finestra di prenotazione affidabile per i voli da {origin} a {destination}.', routeBestTimeBodyShortHaul: 'I dati attuali della rotta non stabiliscono una finestra di prenotazione affidabile per i voli da {origin} a {destination}.', routeBestTimeBodyMediumHaul: 'I dati attuali della rotta non stabiliscono una finestra di prenotazione affidabile per i voli da {origin} a {destination}.', routeBestTimeBodyDomesticLongHaul: 'I dati attuali della rotta non stabiliscono una finestra di prenotazione affidabile per i voli da {origin} a {destination}.', routeBestTimeBodyDomesticShortHaul: 'I dati attuali della rotta non stabiliscono una finestra di prenotazione affidabile per i voli da {origin} a {destination}.',
    routeBestTimeTipDirect: 'Usa i risultati attuali per confrontare le opzioni dirette disponibili.', routeBestTimeTipConnecting: 'Usa i risultati attuali per confrontare le opzioni con scalo.', routeBestTimeTipMixed: 'Usa i risultati attuali per confrontare le opzioni dirette e con scalo.', routeBestTimeClosingV1: 'Disponibilità e prezzi possono variare in base alla data.', routeBestTimeClosingV2: 'Controlla i risultati attuali per le date del viaggio.', routeFaqBestTimeQuestion: 'Come posso pianificare un volo da {origin} a {destination}?', routeFaqBestTimeAnswerLongHaul: 'I dati attuali non stabiliscono una finestra di prenotazione affidabile. Confronta le opzioni disponibili per le tue date.', routeFaqBestTimeAnswerMediumHaul: 'I dati attuali non stabiliscono una finestra di prenotazione affidabile. Confronta le opzioni disponibili per le tue date.', routeFaqBestTimeAnswerShortHaul: 'I dati attuali non stabiliscono una finestra di prenotazione affidabile. Confronta le opzioni disponibili per le tue date.',
  },
  nl: {
    routeBestTimeHeading: 'Informatie voor vluchtplanning', routeBestTimeBookingWindowLabel: 'Boekingsperiode', routeBestTimeWindowLongHaul: 'Niet beschikbaar op basis van de huidige routegegevens', routeBestTimeWindowShortHaul: 'Niet beschikbaar op basis van de huidige routegegevens',
    routeBestTimeBodyLongHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode voor vluchten van {origin} naar {destination}.', routeBestTimeBodyShortHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode voor vluchten van {origin} naar {destination}.', routeBestTimeBodyMediumHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode voor vluchten van {origin} naar {destination}.', routeBestTimeBodyDomesticLongHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode voor vluchten van {origin} naar {destination}.', routeBestTimeBodyDomesticShortHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode voor vluchten van {origin} naar {destination}.',
    routeBestTimeTipDirect: 'Gebruik de huidige resultaten om beschikbare directe opties te vergelijken.', routeBestTimeTipConnecting: 'Gebruik de huidige resultaten om opties met een tussenstop te vergelijken.', routeBestTimeTipMixed: 'Gebruik de huidige resultaten om directe opties en opties met een tussenstop te vergelijken.', routeBestTimeClosingV1: 'Beschikbaarheid en prijzen kunnen per reisdatum verschillen.', routeBestTimeClosingV2: 'Bekijk de huidige zoekresultaten voor je geplande reisdata.', routeFaqBestTimeQuestion: 'Hoe plan ik een vlucht van {origin} naar {destination}?', routeFaqBestTimeAnswerLongHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode. Vergelijk de beschikbare opties voor je reisdata.', routeFaqBestTimeAnswerMediumHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode. Vergelijk de beschikbare opties voor je reisdata.', routeFaqBestTimeAnswerShortHaul: 'De huidige routegegevens geven geen betrouwbare boekingsperiode. Vergelijk de beschikbare opties voor je reisdata.',
  },
  tr: {
    routeBestTimeHeading: 'Uçuş planlama bilgileri', routeBestTimeBookingWindowLabel: 'Rezervasyon dönemi', routeBestTimeWindowLongHaul: 'Mevcut rota verilerinden belirlenemiyor', routeBestTimeWindowShortHaul: 'Mevcut rota verilerinden belirlenemiyor',
    routeBestTimeBodyLongHaul: '{origin} - {destination} uçuşları için mevcut rota verileri güvenilir bir rezervasyon dönemi belirlemiyor.', routeBestTimeBodyShortHaul: '{origin} - {destination} uçuşları için mevcut rota verileri güvenilir bir rezervasyon dönemi belirlemiyor.', routeBestTimeBodyMediumHaul: '{origin} - {destination} uçuşları için mevcut rota verileri güvenilir bir rezervasyon dönemi belirlemiyor.', routeBestTimeBodyDomesticLongHaul: '{origin} - {destination} uçuşları için mevcut rota verileri güvenilir bir rezervasyon dönemi belirlemiyor.', routeBestTimeBodyDomesticShortHaul: '{origin} - {destination} uçuşları için mevcut rota verileri güvenilir bir rezervasyon dönemi belirlemiyor.',
    routeBestTimeTipDirect: 'Mevcut sonuçları kullanarak doğrudan uçuş seçeneklerini karşılaştırın.', routeBestTimeTipConnecting: 'Mevcut sonuçları kullanarak aktarmalı seçenekleri karşılaştırın.', routeBestTimeTipMixed: 'Mevcut sonuçları kullanarak direkt ve aktarmalı seçenekleri karşılaştırın.', routeBestTimeClosingV1: 'Müsaitlik ve fiyatlar seyahat tarihine göre değişebilir.', routeBestTimeClosingV2: 'Planladığınız tarihler için güncel arama sonuçlarını kontrol edin.', routeFaqBestTimeQuestion: '{origin} - {destination} uçuşu nasıl planlanır?', routeFaqBestTimeAnswerLongHaul: 'Mevcut veriler güvenilir bir rezervasyon dönemi belirlemiyor. Seyahat tarihiniz için mevcut seçenekleri karşılaştırın.', routeFaqBestTimeAnswerMediumHaul: 'Mevcut veriler güvenilir bir rezervasyon dönemi belirlemiyor. Seyahat tarihiniz için mevcut seçenekleri karşılaştırın.', routeFaqBestTimeAnswerShortHaul: 'Mevcut veriler güvenilir bir rezervasyon dönemi belirlemiyor. Seyahat tarihiniz için mevcut seçenekleri karşılaştırın.',
  },
};

// [I18N-FALLBACK] language -> English -> German -> the raw key itself.
function translate(key, lang) {
  const seoTemplate = ROUTE_SEO_TEMPLATES[lang] && ROUTE_SEO_TEMPLATES[lang][key];
  if (seoTemplate) return seoTemplate;
  const safePlanning = ROUTE_PLANNING_SAFE_COPY[lang] && ROUTE_PLANNING_SAFE_COPY[lang][key];
  if (safePlanning) return safePlanning;
  if (ROUTE_PLANNING_SAFE_COPY.en[key]) return ROUTE_PLANNING_SAFE_COPY.en[key];
  const dict = DICTS[lang];
  if (dict && dict[key] != null) return dict[key];
  if (DICTS.en && DICTS.en[key] != null) return DICTS.en[key];
  if (DICTS[DEFAULT_LANGUAGE] && DICTS[DEFAULT_LANGUAGE][key] != null) return DICTS[DEFAULT_LANGUAGE][key];
  return key;
}

function format(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}

function stringsFor(lang) {
  const out = {};
  Object.keys(DICTS.en).forEach((k) => { out[k] = translate(k, lang); });
  return out;
}

module.exports = { translate, format, stringsFor, DICTS };