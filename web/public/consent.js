/* ═══════════════════════════════════════════════════════════════
 * consent.js — Cookie/Analytics consent gate (GDPR / TDDDG).
 *
 * Google Analytics 4 must NOT load or transmit anything until the
 * visitor has explicitly accepted analytics cookies. This file replaces
 * the old unconditional
 *   <script async src=".../gtag/js?id=G-..."></script>
 *   <script src="/analytics.js"></script>
 * pair that used to sit in every page's <head> and fired GA on load,
 * before any consent — the exact issue this fixes.
 *
 * Behaviour:
 *  1. On load we set Google Consent Mode v2 defaults to DENIED and do
 *     NOT inject the GA library. gtag() calls made by app.js are guarded
 *     by `typeof gtag === 'function'`; the stub here only queues them in
 *     dataLayer (in memory) — with no GA library present nothing is ever
 *     transmitted to Google.
 *  2. If the visitor previously accepted, we grant consent and load GA.
 *  3. Otherwise we show a banner with clear Accept / Reject buttons and a
 *     link to the privacy policy. Only "Accept" loads GA + grants consent.
 *     "Reject" persists the choice and GA never loads.
 *
 * The choice is stored in localStorage under 'airpiv_cookie_consent'
 * ('granted' | 'denied'). Reopen the banner anytime via
 * window.airpivOpenCookieSettings().
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var GA_ID = 'G-2K257GSWEM';
  var STORAGE_KEY = 'airpiv_cookie_consent';

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

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function persist(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  // ── i18n for the banner (site languages) ──
  var T = {
    de: { t: 'Wir verwenden Cookies', b: 'Wir nutzen technisch notwendige Cookies sowie – nur mit deiner Einwilligung – Google Analytics, um unsere Website zu verbessern. Es werden keine Analyse-Cookies gesetzt, bis du zustimmst.', a: 'Akzeptieren', r: 'Ablehnen', p: 'Datenschutz', purl: '/privacy.html' },
    en: { t: 'We use cookies', b: 'We use strictly necessary cookies and – only with your consent – Google Analytics to improve our website. No analytics cookies are set until you agree.', a: 'Accept', r: 'Reject', p: 'Privacy', purl: '/privacy.html' },
    ar: { t: 'نستخدم ملفات تعريف الارتباط', b: 'نستخدم ملفات ضرورية تقنياً، وبموافقتك فقط نستخدم Google Analytics لتحسين موقعنا. لا يتم ضبط أي ملفات تحليلية قبل موافقتك.', a: 'أوافق', r: 'رفض', p: 'الخصوصية', purl: '/privacy.html' },
    es: { t: 'Usamos cookies', b: 'Usamos cookies estrictamente necesarias y, solo con tu consentimiento, Google Analytics para mejorar nuestro sitio. No se instalan cookies de análisis hasta que lo aceptes.', a: 'Aceptar', r: 'Rechazar', p: 'Privacidad', purl: '/privacy.html' },
    fr: { t: 'Nous utilisons des cookies', b: 'Nous utilisons des cookies strictement nécessaires et, uniquement avec votre consentement, Google Analytics pour améliorer notre site. Aucun cookie analytique n\'est déposé avant votre accord.', a: 'Accepter', r: 'Refuser', p: 'Confidentialité', purl: '/privacy.html' },
    it: { t: 'Utilizziamo i cookie', b: 'Utilizziamo cookie strettamente necessari e, solo con il tuo consenso, Google Analytics per migliorare il nostro sito. Nessun cookie analitico viene impostato prima del tuo consenso.', a: 'Accetta', r: 'Rifiuta', p: 'Privacy', purl: '/privacy.html' },
    nl: { t: 'Wij gebruiken cookies', b: 'We gebruiken strikt noodzakelijke cookies en – alleen met jouw toestemming – Google Analytics om onze website te verbeteren. Er worden geen analytische cookies geplaatst voordat je akkoord gaat.', a: 'Accepteren', r: 'Weigeren', p: 'Privacy', purl: '/privacy.html' },
    tr: { t: 'Çerez kullanıyoruz', b: 'Kesinlikle gerekli çerezleri ve yalnızca onayınızla web sitemizi iyileştirmek için Google Analytics kullanıyoruz. Onay vermeden hiçbir analitik çerez ayarlanmaz.', a: 'Kabul et', r: 'Reddet', p: 'Gizlilik', purl: '/privacy.html' },
  };
  function lang() {
    var l = (document.documentElement.getAttribute('lang') || '').slice(0, 2).toLowerCase();
    if (T[l]) return l;
    var p = (location.pathname.split('/')[1] || '').toLowerCase();
    if (T[p]) return p;
    return 'de';
  }

  // The banner is position:fixed at the bottom, so on tall forms (e.g. the
  // multi-city search panel) it overlaps the bottom action buttons ("add
  // destination", Search) and swallows their taps. Reserve matching space at
  // the bottom of the page so that content can scroll clear of the banner.
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
    body.style.cssText = 'color:#cfdae4;margin-bottom:14px';
    body.appendChild(document.createTextNode(tr.b + ' '));
    var link = document.createElement('a');
    link.href = tr.purl;
    link.textContent = tr.p;
    link.style.cssText = 'color:#12C7B0;text-decoration:underline';
    body.appendChild(link);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.textContent = tr.r;
    reject.style.cssText = 'flex:1;min-width:120px;padding:11px 16px;border-radius:10px;border:1.5px solid #35505f;background:transparent;color:#fff;font-weight:700;font-size:14px;cursor:pointer';
    reject.addEventListener('click', function () { persist('denied'); removeBanner(); });

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.textContent = tr.a;
    accept.style.cssText = 'flex:1;min-width:120px;padding:11px 16px;border-radius:10px;border:0;background:#12C7B0;color:#04231f;font-weight:800;font-size:14px;cursor:pointer';
    accept.addEventListener('click', function () { persist('granted'); loadGA(); removeBanner(); });

    row.appendChild(reject);
    row.appendChild(accept);
    wrap.appendChild(h);
    wrap.appendChild(body);
    wrap.appendChild(row);

    (document.body || document.documentElement).appendChild(wrap);
    // Reserve room below the page content so bottom buttons clear the banner.
    reserveSpace(wrap.offsetHeight + 32);
    window.addEventListener('resize', function () {
      if (document.getElementById('airpiv-cookie-banner')) reserveSpace(wrap.offsetHeight + 32);
    });
  }

  window.airpivOpenCookieSettings = showBanner;

  function init() {
    var choice = stored();
    if (choice === 'granted') { loadGA(); return; }
    if (choice === 'denied') { return; }
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
