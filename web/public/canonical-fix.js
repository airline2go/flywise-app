(function () {
  var base = 'https://airpiv.com';
  var HOME_LANGS = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
  var PREFIXED = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
  var path = window.location.pathname;
  var clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  var seg = clean.split('/')[1] || '';
  var isPrefixed = PREFIXED.indexOf(seg) !== -1;
  var lang = HOME_LANGS.indexOf(seg) !== -1 ? seg : 'de';
  var canonical = isPrefixed ? base + '/' + seg : base + '/';
  var canonicalEl = document.getElementById('canonical-url');
  if (canonicalEl) canonicalEl.setAttribute('href', canonical);
  var META = {
    en: { t: 'Airpiv | Book cheap flights & compare airfares', d: 'Search and book cheap flights on Airpiv. Compare airfares worldwide, find last-minute deals and get the best prices with no hidden fees.', ogl: 'en_GB' },
    ar: { t: 'Airpiv | احجز رحلات طيران رخيصة وقارن أسعار التذاكر', d: 'ابحث واحجز رحلات طيران رخيصة على Airpiv. قارن أسعار تذاكر الطيران حول العالم، واعثر على عروض اللحظة الأخيرة، واحصل على أفضل الأسعار دون رسوم خفية.', ogl: 'ar_AR' },
    es: { t: 'Airpiv | Reserva vuelos baratos y compara billetes de avión', d: 'Busca y reserva vuelos baratos en Airpiv. Compara billetes de avión en todo el mundo, encuentra ofertas de última hora y consigue los mejores precios sin cargos ocultos.', ogl: 'es_ES' },
    fr: { t: "Airpiv | Réservez des vols pas chers et comparez les billets d'avion", d: "Recherchez et réservez des vols pas chers sur Airpiv. Comparez les billets d'avion dans le monde entier, trouvez des offres de dernière minute et obtenez les meilleurs prix sans frais cachés.", ogl: 'fr_FR' },
    it: { t: 'Airpiv | Prenota voli economici e confronta i biglietti aerei', d: 'Cerca e prenota voli economici su Airpiv. Confronta i biglietti aerei in tutto il mondo, trova offerte last minute e ottieni i prezzi migliori senza costi nascosti.', ogl: 'it_IT' },
    nl: { t: 'Airpiv | Boek goedkope vluchten & vergelijk vliegtickets', d: 'Zoek en boek goedkope vluchten op Airpiv. Vergelijk vliegtickets wereldwijd, vind last-minute aanbiedingen en krijg de beste prijzen zonder verborgen kosten.', ogl: 'nl_NL' },
    tr: { t: 'Airpiv | Ucuz uçak bileti bul ve fiyatları karşılaştır', d: "Airpiv'de ucuz uçuşları arayın ve rezervasyon yapın. Dünya genelinde uçak biletlerini karşılaştırın, son dakika fırsatlarını bulun ve gizli ücret ödemeden en iyi fiyatları yakalayın.", ogl: 'tr_TR' }
  };
  var m = META[lang];
  if (m) {
    try {
      document.documentElement.setAttribute('lang', lang);
      document.title = m.t;
      setNamed('description', m.d); setProp('og:title', m.t); setProp('og:description', m.d);
      setProp('og:locale', m.ogl); setProp('og:url', canonical);
      setNamed('twitter:title', m.t); setNamed('twitter:description', m.d);
    } catch (e) {}
  }
  function setNamed(name, value) { var el = document.querySelector('meta[name="' + name + '"]'); if (el) el.setAttribute('content', value); }
  function setProp(prop, value) { var el = document.querySelector('meta[property="' + prop + '"]'); if (el) el.setAttribute('content', value); }

  /* Shared autocomplete UI layers. */
  if (!document.querySelector('script[data-airpiv-autocomplete-v9]')) {
    var s = document.createElement('script');
    s.src = '/autocomplete-ui-v9.js';
    s.async = false;
    s.setAttribute('data-airpiv-autocomplete-v9', '1');
    (document.head || document.documentElement).appendChild(s);
  }
  if (!document.querySelector('script[data-airpiv-autocomplete-v10]')) {
    var v10 = document.createElement('script');
    v10.src = '/autocomplete-fix-v10.js';
    v10.async = false;
    v10.setAttribute('data-airpiv-autocomplete-v10', '1');
    (document.head || document.documentElement).appendChild(v10);
  }
})();
