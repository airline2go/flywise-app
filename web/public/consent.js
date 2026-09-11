/* ═══════════════════════════════════════════════════════════════
 * consent.js — Cookie/Analytics/Advertising consent gate (GDPR / TDDDG).
 *
 * Nothing is transmitted to Google until the visitor explicitly consents,
 * and Analytics and Advertising are SEPARATE choices — advertising consent
 * is never assumed from analytics consent. This file is the ONLY place that
 * loads the Google tag (gtag.js?id=G-2K257GSWEM). That single tag is reused
 * to initialise BOTH Google Analytics 4 and Google Ads (AW-…) — there is no
 * second gtag, no second GA script, no second Ads script, and no GTM.
 *
 * Behaviour:
 *  1. On load we set Google Consent Mode v2 defaults to DENIED (ad_storage,
 *     ad_user_data, ad_personalization, analytics_storage) and do NOT inject
 *     the Google tag. gtag() calls made by app.js are guarded by
 *     `typeof gtag === 'function'`; the stub here only queues them in
 *     dataLayer (in memory) — with no tag library present nothing is sent.
 *  2. If the visitor previously chose, we re-apply that choice (granting only
 *     the categories they accepted) and load the tag if anything was granted.
 *  3. Otherwise we show a banner with two independent toggles — Analytics and
 *     Advertising — plus Accept all / Save choices / Reject. Defaults are
 *     unchecked (no pre-ticked consent).
 *
 * Choice is stored in localStorage under 'airpiv_consent_v2' as
 * {"analytics":bool,"ad":bool}. The legacy key 'airpiv_cookie_consent'
 * ('granted'|'denied', analytics-only) is still read for back-compat.
 * Reopen anytime via window.airpivOpenCookieSettings().
 *
 * Exposes:
 *   window.airpivHasAdConsent()        -> boolean (advertising consent)
 *   window.airpivHasAnalyticsConsent() -> boolean (analytics consent)
 *   window.airpivConsentState          -> {analytics, ad} | null
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var GA_ID = 'G-2K257GSWEM';
  var STORAGE_KEY = 'airpiv_consent_v2';
  var LEGACY_KEY = 'airpiv_cookie_consent';

  // Google Ads conversion id comes from the central config (config.js). It may
  // not be present on pages that don't load config.js, or not yet parsed when
  // consent.js runs in <head> — callers read it lazily.
  function adsId() {
    try {
      return (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_ADS_CONVERSION_ID) || null;
    } catch (e) { return null; }
  }

  // ── Consent Mode v2: default everything to denied BEFORE any tag loads ──
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  });
  gtag('js', new Date());

  window.airpivConsentState = null;

  var tagLoaded = false;
  // Load the single Google tag library exactly once (reused for GA4 + Ads).
  function loadTag() {
    if (tagLoaded) return;
    tagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  var gaConfigured = false;
  var adsConfigured = false;

  // Apply a consent state: update the relevant Consent Mode v2 signals, load
  // the tag if anything is granted, and configure GA4 / Ads accordingly.
  function applyConsent(state) {
    window.airpivConsentState = { analytics: !!state.analytics, ad: !!state.ad };

    if (state.analytics) {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    if (state.ad) {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }

    if (!state.analytics && !state.ad) return; // nothing to load

    loadTag();

    if (state.analytics && !gaConfigured) {
      gaConfigured = true;
      gtag('config', GA_ID, { anonymize_ip: true });
    }
    if (state.ad && !adsConfigured) {
      var aw = adsId();
      if (aw) {
        adsConfigured = true;
        // Initialise Google Ads on the SAME tag. Auto-tagging (gclid) stays
        // enabled by default — we never disable it.
        gtag('config', aw);
      }
    }
  }

  window.airpivHasAdConsent = function () {
    return !!(window.airpivConsentState && window.airpivConsentState.ad);
  };
  window.airpivHasAnalyticsConsent = function () {
    return !!(window.airpivConsentState && window.airpivConsentState.analytics);
  };

  function readStored() {
    // New granular key first.
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        return { analytics: !!o.analytics, ad: !!o.ad };
      }
    } catch (e) {}
    // Legacy analytics-only key.
    try {
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === 'granted') return { analytics: true, ad: false };
      if (legacy === 'denied') return { analytics: false, ad: false };
    } catch (e) {}
    return null;
  }
  function persist(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: !!state.analytics, ad: !!state.ad })); } catch (e) {}
    // Keep the legacy key roughly in sync for any old reader.
    try { localStorage.setItem(LEGACY_KEY, state.analytics ? 'granted' : 'denied'); } catch (e) {}
  }

  // ── i18n for the banner (site languages) ──
  var T = {
    de: { t: 'Wir verwenden Cookies', b: 'Wir nutzen technisch notwendige Cookies sowie – nur mit deiner Einwilligung – Cookies für Statistik (Google Analytics) und Marketing (Google Ads). Du kannst jede Kategorie einzeln wählen.', an: 'Statistik (Analytics)', ad: 'Marketing (Werbung)', aa: 'Alle akzeptieren', sv: 'Auswahl speichern', r: 'Ablehnen', p: 'Datenschutz', purl: '/privacy.html' },
    en: { t: 'We use cookies', b: 'We use strictly necessary cookies and – only with your consent – statistics (Google Analytics) and marketing (Google Ads) cookies. You can choose each category independently.', an: 'Statistics (Analytics)', ad: 'Marketing (Advertising)', aa: 'Accept all', sv: 'Save choices', r: 'Reject', p: 'Privacy', purl: '/privacy.html' },
    ar: { t: 'نستخدم ملفات تعريف الارتباط', b: 'نستخدم ملفات ضرورية تقنياً، وبموافقتك فقط ملفات للإحصاء (Google Analytics) وللتسويق (Google Ads). يمكنك اختيار كل فئة على حدة.', an: 'إحصاءات (Analytics)', ad: 'تسويق (إعلانات)', aa: 'قبول الكل', sv: 'حفظ الاختيار', r: 'رفض', p: 'الخصوصية', purl: '/privacy.html' },
    es: { t: 'Usamos cookies', b: 'Usamos cookies estrictamente necesarias y, solo con tu consentimiento, cookies de estadística (Google Analytics) y de marketing (Google Ads). Puedes elegir cada categoría por separado.', an: 'Estadística (Analytics)', ad: 'Marketing (Publicidad)', aa: 'Aceptar todo', sv: 'Guardar elección', r: 'Rechazar', p: 'Privacidad', purl: '/privacy.html' },
    fr: { t: 'Nous utilisons des cookies', b: 'Nous utilisons des cookies strictement nécessaires et, uniquement avec votre consentement, des cookies de statistiques (Google Analytics) et de marketing (Google Ads). Vous pouvez choisir chaque catégorie séparément.', an: 'Statistiques (Analytics)', ad: 'Marketing (Publicité)', aa: 'Tout accepter', sv: 'Enregistrer', r: 'Refuser', p: 'Confidentialité', purl: '/privacy.html' },
    it: { t: 'Utilizziamo i cookie', b: 'Utilizziamo cookie strettamente necessari e, solo con il tuo consenso, cookie di statistica (Google Analytics) e di marketing (Google Ads). Puoi scegliere ogni categoria separatamente.', an: 'Statistiche (Analytics)', ad: 'Marketing (Pubblicità)', aa: 'Accetta tutto', sv: 'Salva scelte', r: 'Rifiuta', p: 'Privacy', purl: '/privacy.html' },
    nl: { t: 'Wij gebruiken cookies', b: 'We gebruiken strikt noodzakelijke cookies en – alleen met jouw toestemming – cookies voor statistiek (Google Analytics) en marketing (Google Ads). Je kunt elke categorie afzonderlijk kiezen.', an: 'Statistiek (Analytics)', ad: 'Marketing (Advertenties)', aa: 'Alles accepteren', sv: 'Keuze opslaan', r: 'Weigeren', p: 'Privacy', purl: '/privacy.html' },
    tr: { t: 'Çerez kullanıyoruz', b: 'Kesinlikle gerekli çerezleri ve yalnızca onayınızla istatistik (Google Analytics) ve pazarlama (Google Ads) çerezlerini kullanıyoruz. Her kategoriyi ayrı ayrı seçebilirsiniz.', an: 'İstatistik (Analytics)', ad: 'Pazarlama (Reklam)', aa: 'Tümünü kabul et', sv: 'Seçimi kaydet', r: 'Reddet', p: 'Gizlilik', purl: '/privacy.html' },
  };
  function lang() {
    var l = (document.documentElement.getAttribute('lang') || '').slice(0, 2).toLowerCase();
    if (T[l]) return l;
    var p = (location.pathname.split('/')[1] || '').toLowerCase();
    if (T[p]) return p;
    return 'de';
  }

  // The banner is position:fixed at the bottom, so on tall forms it overlaps
  // the bottom action buttons and swallows their taps. Reserve matching space
  // at the bottom of the page so content can scroll clear of the banner.
  function reserveSpace(px) {
    try { document.body.style.paddingBottom = px ? px + 'px' : ''; } catch (e) {}
  }

  function removeBanner() {
    var el = document.getElementById('airpiv-cookie-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    reserveSpace(0);
  }

  function showBanner() {
    if (document.getElementById('airpiv-cookie-banner')) return;
    var tr = T[lang()];
    var rtl = lang() === 'ar';
    var wrap = document.createElement('div');
    wrap.id = 'airpiv-cookie-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', tr.t);
    if (rtl) wrap.setAttribute('dir', 'rtl');
    wrap.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;background:#0a1822;color:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:18px 20px;font-family:inherit;font-size:14px;line-height:1.55';

    var h = document.createElement('div');
    h.textContent = tr.t;
    h.style.cssText = 'font-weight:800;font-size:15px;margin-bottom:6px';

    var body = document.createElement('div');
    body.style.cssText = 'color:#cfdae4;margin-bottom:12px';
    body.appendChild(document.createTextNode(tr.b + ' '));
    var link = document.createElement('a');
    link.href = tr.purl;
    link.textContent = tr.p;
    link.style.cssText = 'color:#12C7B0;text-decoration:underline';
    body.appendChild(link);

    // ── category toggles (default unchecked: no pre-ticked consent) ──
    function toggleRow(id, label) {
      var lab = document.createElement('label');
      lab.style.cssText = 'display:flex;align-items:center;gap:10px;margin:6px 0;color:#eaf1f6;cursor:pointer';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.style.cssText = 'width:18px;height:18px;accent-color:#12C7B0;cursor:pointer';
      var sp = document.createElement('span');
      sp.textContent = label;
      lab.appendChild(cb);
      lab.appendChild(sp);
      return { row: lab, cb: cb };
    }
    var opts = document.createElement('div');
    opts.style.cssText = 'margin-bottom:14px';
    var an = toggleRow('airpiv-consent-analytics', tr.an);
    var ad = toggleRow('airpiv-consent-ad', tr.ad);
    opts.appendChild(an.row);
    opts.appendChild(ad.row);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';

    function choose(state) { persist(state); applyConsent(state); removeBanner(); }

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.textContent = tr.r;
    reject.style.cssText = 'flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:1.5px solid #35505f;background:transparent;color:#fff;font-weight:700;font-size:14px;cursor:pointer';
    reject.addEventListener('click', function () { choose({ analytics: false, ad: false }); });

    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = tr.sv;
    save.style.cssText = 'flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:1.5px solid #12C7B0;background:transparent;color:#12C7B0;font-weight:800;font-size:14px;cursor:pointer';
    save.addEventListener('click', function () { choose({ analytics: an.cb.checked, ad: ad.cb.checked }); });

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.textContent = tr.aa;
    accept.style.cssText = 'flex:1;min-width:110px;padding:11px 14px;border-radius:10px;border:0;background:#12C7B0;color:#04231f;font-weight:800;font-size:14px;cursor:pointer';
    accept.addEventListener('click', function () { choose({ analytics: true, ad: true }); });

    row.appendChild(reject);
    row.appendChild(save);
    row.appendChild(accept);
    wrap.appendChild(h);
    wrap.appendChild(body);
    wrap.appendChild(opts);
    wrap.appendChild(row);

    (document.body || document.documentElement).appendChild(wrap);
    reserveSpace(wrap.offsetHeight + 32);
    window.addEventListener('resize', function () {
      if (document.getElementById('airpiv-cookie-banner')) reserveSpace(wrap.offsetHeight + 32);
    });
  }

  window.airpivOpenCookieSettings = showBanner;

  function init() {
    var choice = readStored();
    if (choice) { applyConsent(choice); return; }
    showBanner();
  }

  // Run after the DOM is ready so config.js (loaded later in the document) has
  // populated window.APP_CONFIG for a returning visitor with ad consent.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
