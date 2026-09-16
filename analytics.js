window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "G-2K257GSWEM");

/*
 * X Ads / X Pixel
 * Pixel ID: rf8jx
 *
 * The base pixel is intentionally initialized from this shared analytics file,
 * which is loaded by the public HTML pages. This keeps the base tag in one
 * place and avoids duplicate pixel initialization.
 *
 * X event IDs are NOT guessed here. X requires an event ID created in Events
 * Manager for code-based conversion events. Once those IDs exist, set them in
 * window.AIRPIV_X_EVENT_IDS (or call airpivX.track with the real event ID).
 */
(function initAirpivXPixel(){
  var PIXEL_ID = "rf8jx";

  window.airpivX = window.airpivX || {};
  window.AIRPIV_X_EVENT_IDS = window.AIRPIV_X_EVENT_IDS || {};

  // Prevent duplicate initialization if analytics.js is ever loaded twice.
  if (!window.__AIRPIV_X_PIXEL_INITIALIZED__) {
    window.__AIRPIV_X_PIXEL_INITIALIZED__ = true;

    !function(e,t,n,s,u,a){
      e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},
      s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,
      u.src='https://static.ads-twitter.com/uwt.js',
      a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))
    }(window,document,'script');

    twq('config', PIXEL_ID);
  }

  function getEventId(name){
    var id = window.AIRPIV_X_EVENT_IDS[name];
    if (!id || typeof id !== 'string') return null;
    return id;
  }

  function safeParams(params){
    if (!params || typeof params !== 'object') return {};
    var out = {};
    Object.keys(params).forEach(function(key){
      var value = params[key];
      if (value === undefined || value === null) return;
      // Never send raw form fields/passwords/passport data through this helper.
      if (/password|pass_?num|passport|card|cvv|cvc|iban|phone_number|email_address/i.test(key)) return;
      out[key] = value;
    });
    return out;
  }

  window.airpivX.track = function(name, params){
    var eventId = getEventId(name);
    if (!eventId || typeof window.twq !== 'function') return false;
    window.twq('event', eventId, safeParams(params));
    return true;
  };

  window.airpivX.setEventIds = function(ids){
    if (!ids || typeof ids !== 'object') return;
    Object.keys(ids).forEach(function(key){
      if (typeof ids[key] === 'string' && ids[key]) {
        window.AIRPIV_X_EVENT_IDS[key] = ids[key];
      }
    });
  };

  // Generic, conservative website signals. These only fire when a matching
  // X event ID has been configured; nothing is invented or sent otherwise.
  function searchParams(){
    var from = document.querySelector('#from, [name="from"], [name="departure"]');
    var to = document.querySelector('#to, [name="to"], [name="destination"]');
    var date = document.querySelector('#depart, [name="depart"], [name="date"]');
    var parts = [];
    if (from && from.value) parts.push(from.value);
    if (to && to.value) parts.push('→ ' + to.value);
    if (date && date.value) parts.push(date.value);
    return parts.join(' ');
  }

  function closestMeaningfulButton(target){
    if (!target || !target.closest) return null;
    return target.closest('button, [role="button"], input[type="submit"], a');
  }

  function normalizeText(value){
    return String(value || '').replace(/\s+/g,' ').trim().toLowerCase();
  }

  document.addEventListener('click', function(ev){
    var el = closestMeaningfulButton(ev.target);
    if (!el) return;

    var text = normalizeText(el.getAttribute('aria-label') || el.textContent);
    var id = normalizeText(el.id);
    var cls = normalizeText(el.className);
    var signal = text + ' ' + id + ' ' + cls;

    if (/\b(search|suchen|chercher|buscar|ricerca|zoeken|بحث)\b/.test(signal)) {
      window.airpivX.track('search', {search_string: searchParams()});
      return;
    }

    if (/\b(checkout|zahlung|pay|bezahlen|checkout|الدفع|pagar|paiement)\b/.test(signal)) {
      window.airpivX.track('checkout_initiated');
      return;
    }

    if (/\b(add to cart|add-to-cart|warenkorb|in den warenkorb)\b/.test(signal)) {
      window.airpivX.track('add_to_cart');
      return;
    }

    if (/\b(sign up|register|registrieren|anmelden|inscrire|registrar|تسجيل)\b/.test(signal)) {
      window.airpivX.track('lead');
    }
  }, true);

  // Allow the application to emit precise lifecycle events without coupling
  // app.js to the X SDK. Example: window.dispatchEvent(new CustomEvent(...)).
  window.addEventListener('airpiv:x-event', function(ev){
    var detail = ev && ev.detail;
    if (!detail || !detail.name) return;
    window.airpivX.track(detail.name, detail.params || {});
  });
})();

// Blog listing currently lives at /blog.html. Keep article links on a
// real static route that GitHub Pages serves instead of emitting the
// unsupported /blog/<slug> path (which otherwise resolves to 404).
(function(){
  if (window.location.pathname !== '/blog.html') return;

  function normalizeBlogLinks(){
    document.querySelectorAll('a[href^="/blog/"]').forEach(function(a){
      var slug = a.getAttribute('href').slice('/blog/'.length);
      if (!slug || slug === 'html') return;
      a.setAttribute('href', '/blog-post.html?slug=' + slug);
    });

    var schema = document.getElementById('itemlist-schema');
    if (schema && schema.textContent) {
      try {
        var data = JSON.parse(schema.textContent);
        if (Array.isArray(data.itemListElement)) {
          data.itemListElement.forEach(function(item){
            if (item.url) {
              var match = item.url.match(/\/blog\/([^/?#]+)$/);
              if (match) item.url = 'https://airpiv.com/blog-post.html?slug=' + match[1];
            }
          });
          schema.textContent = JSON.stringify(data);
        }
      } catch (_) {}
    }
  }

  document.addEventListener('DOMContentLoaded', normalizeBlogLinks);
  new MutationObserver(normalizeBlogLinks).observe(document.documentElement, {childList:true, subtree:true});
})();
