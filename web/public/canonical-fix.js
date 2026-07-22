(function () {
  var base = 'https://airpiv.com';

  // Language homes that serve this SAME verbatim index.html under a prefix
  // (German is the unprefixed root). Keep in sync with next.config.mjs
  // LANG_HOMES and the hreflang tags in <head>.
  var HOME_LANGS = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];

  var path = window.location.pathname;
  var clean = path.length > 1 ? path.replace(/\/+$/, '') : path; // drop trailing slash (except root)
  var seg = clean.split('/')[1] || '';
  var lang = HOME_LANGS.indexOf(seg) !== -1 ? seg : 'de';

  // [HREFLANG-CANONICAL-FIX] Each language's home URL must be canonical to
  // ITSELF, not silently collapsed back to the bare root — otherwise the
  // hreflang tags in <head> (which claim /en, /ar, …, /tr are distinct,
  // self-referencing indexable pages) directly contradict the canonical
  // tag, telling Google "ignore the language-specific URL, this is really
  // just the default page" — defeating the purpose of the hreflang cluster.
  // Derived from the clean pathname only (never a query string), matching
  // the no-trailing-slash convention every other clean URL on the site uses.
  var canonical = lang === 'de' ? base + '/' : base + '/' + lang;
  var canonicalEl = document.getElementById('canonical-url');
  if (canonicalEl) canonicalEl.setAttribute('href', canonical);

  // [HOME-META-I18N] The home is one verbatim HTML file served under every
  // language prefix, so its <title>/<meta description>/OG tags start out
  // German for ALL of them — a real multilingual-SEO problem: /en, /ar, …
  // presented German metadata while claiming (via hreflang) to be their own
  // language. Localize the head per language here, client-side, using the
  // exact same mechanism (and the same set of home URLs) as the canonical
  // fix above. German is left byte-identical (its static tags are already
  // correct); only the six prefixed languages are rewritten. Entity pages
  // (/flights, /city, …) are localized server-side and never load this
  // script, so this only ever touches the home. `dir` is intentionally NOT
  // changed — the SPA's home layout is LTR and forcing rtl here could shift
  // it; `lang` alone is the SEO-relevant signal.
  var META = {
    en: {
      t: 'Airpiv | Book cheap flights & compare airfares',
      d: 'Search and book cheap flights on Airpiv. Compare airfares worldwide, find last-minute deals and get the best prices with no hidden fees.',
      ogl: 'en_GB',
    },
    ar: {
      t: 'Airpiv | احجز رحلات طيران رخيصة وقارن أسعار التذاكر',
      d: 'ابحث واحجز رحلات طيران رخيصة على Airpiv. قارن أسعار تذاكر الطيران حول العالم، واعثر على عروض اللحظة الأخيرة، واحصل على أفضل الأسعار دون رسوم خفية.',
      ogl: 'ar_AR',
    },
    es: {
      t: 'Airpiv | Reserva vuelos baratos y compara billetes de avión',
      d: 'Busca y reserva vuelos baratos en Airpiv. Compara billetes de avión en todo el mundo, encuentra ofertas de última hora y consigue los mejores precios sin cargos ocultos.',
      ogl: 'es_ES',
    },
    fr: {
      t: "Airpiv | Réservez des vols pas chers et comparez les billets d'avion",
      d: "Recherchez et réservez des vols pas chers sur Airpiv. Comparez les billets d'avion dans le monde entier, trouvez des offres de dernière minute et obtenez les meilleurs prix sans frais cachés.",
      ogl: 'fr_FR',
    },
    it: {
      t: 'Airpiv | Prenota voli economici e confronta i biglietti aerei',
      d: 'Cerca e prenota voli economici su Airpiv. Confronta i biglietti aerei in tutto il mondo, trova offerte last minute e ottieni i prezzi migliori senza costi nascosti.',
      ogl: 'it_IT',
    },
    nl: {
      t: 'Airpiv | Boek goedkope vluchten & vergelijk vliegtickets',
      d: 'Zoek en boek goedkope vluchten op Airpiv. Vergelijk vliegtickets wereldwijd, vind last-minute aanbiedingen en krijg de beste prijzen zonder verborgen kosten.',
      ogl: 'nl_NL',
    },
    tr: {
      t: 'Airpiv | Ucuz uçak bileti bul ve fiyatları karşılaştır',
      d: "Airpiv'de ucuz uçuşları arayın ve rezervasyon yapın. Dünya genelinde uçak biletlerini karşılaştırın, son dakika fırsatlarını bulun ve gizli ücret ödemeden en iyi fiyatları yakalayın.",
      ogl: 'tr_TR',
    },
  };

  var m = META[lang];
  if (m) {
    try {
      document.documentElement.setAttribute('lang', lang);
      document.title = m.t;
      setNamed('description', m.d);
      setProp('og:title', m.t);
      setProp('og:description', m.d);
      setProp('og:locale', m.ogl);
      setProp('og:url', canonical);
      setNamed('twitter:title', m.t);
      setNamed('twitter:description', m.d);
    } catch (e) { /* metadata localization is best-effort — never break the page */ }
  }

  function setNamed(name, value) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (el) el.setAttribute('content', value);
  }
  function setProp(prop, value) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (el) el.setAttribute('content', value);
  }
})();
