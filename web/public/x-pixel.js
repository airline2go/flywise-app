/*
 * Airpiv X Pixel bridge.
 *
 * The base pixel is loaded only after advertising consent. The existing web
 * app already has one trackEvent() layer; this file bridges that real event
 * stream to X without changing booking/search behaviour or sending passenger
 * PII.
 *
 * X Conversion Event IDs are intentionally not invented. Populate
 * window.AIRPIV_X_EVENT_IDS with IDs copied from X Events Manager.
 */
(function () {
  'use strict';

  var PIXEL_ID = 'rf8jx';
  var initialized = false;
  var bridgeInstalled = false;
  var attempts = 0;
  var MAX_ATTEMPTS = 600;

  var EVENT_IDS = {
    search_started: null,
    search: null,
    search_results: null,
    search_results_loaded: null,
    select_item: null,
    offer_selected: null,
    begin_checkout: null,
    checkout_started: null,
    payment_started: null,
    purchase: null,
    payment_success: null,
    booking_completed: null,
    booking_cancelled: null,
    lead: null,
    api_error: null
  };

  function hasAdConsent() {
    try {
      return typeof window.airpivHasAdConsent === 'function' && window.airpivHasAdConsent();
    } catch (e) {
      return false;
    }
  }

  function getEventIds() {
    var configured = window.AIRPIV_X_EVENT_IDS;
    if (!configured || typeof configured !== 'object') return EVENT_IDS;
    var merged = {}, k;
    for (k in EVENT_IDS) {
      if (Object.prototype.hasOwnProperty.call(EVENT_IDS, k)) merged[k] = EVENT_IDS[k];
    }
    for (k in configured) {
      if (Object.prototype.hasOwnProperty.call(configured, k) &&
          typeof configured[k] === 'string' && configured[k].trim()) {
        merged[k] = configured[k].trim();
      }
    }
    return merged;
  }

  function cleanParams(name, params) {
    params = params && typeof params === 'object' ? params : {};
    var out = {};

    if (typeof params.value === 'number' && isFinite(params.value)) out.value = params.value;
    if (typeof params.currency === 'string' && params.currency.trim()) out.currency = params.currency.trim().toUpperCase();
    if (typeof params.conversion_id === 'string' && params.conversion_id.trim()) out.conversion_id = params.conversion_id.trim();
    if (typeof params.search_string === 'string' && params.search_string.trim()) out.search_string = params.search_string.trim().slice(0, 256);
    if (typeof params.description === 'string' && params.description.trim()) out.description = params.description.trim().slice(0, 256);
    if (typeof params.status === 'string' && params.status.trim()) out.status = params.status.trim().slice(0, 64);

    if (Array.isArray(params.contents)) {
      out.contents = params.contents.slice(0, 50).map(function (item) {
        if (!item || typeof item !== 'object') return null;
        var c = {};
        ['content_type', 'content_id', 'content_name', 'content_group_id'].forEach(function (key) {
          if (typeof item[key] === 'string' && item[key].trim()) c[key] = item[key].trim().slice(0, 256);
        });
        if (typeof item.content_price === 'number' && isFinite(item.content_price)) c.content_price = item.content_price;
        if (typeof item.num_items === 'number' && isFinite(item.num_items)) c.num_items = Math.max(1, Math.floor(item.num_items));
        return Object.keys(c).length ? c : null;
      }).filter(Boolean);
      if (!out.contents.length) delete out.contents;
    }

    if (!out.conversion_id && name === 'purchase' &&
        typeof params.transaction_id === 'string' && params.transaction_id.trim()) {
      out.conversion_id = params.transaction_id.trim();
    }

    return out;
  }

  function xEventIdFor(name) {
    var ids = getEventIds();
    return ids[name] || null;
  }

  function sendEvent(name, params) {
    if (!initialized || !hasAdConsent() || typeof window.twq !== 'function') return;
    var eventId = xEventIdFor(name);
    if (!eventId) return;
    try {
      window.twq('event', eventId, cleanParams(name, params));
    } catch (e) {}
  }

  function installBridge() {
    if (bridgeInstalled || typeof window.trackEvent !== 'function') return;
    var original = window.trackEvent;
    if (original.__airpivXBridge) {
      bridgeInstalled = true;
      return;
    }

    function bridgedTrackEvent(name, params) {
      try {
        original(name, params);
      } finally {
        try { sendEvent(name, params); } catch (e) {}
      }
    }

    bridgedTrackEvent.__airpivXBridge = true;
    bridgedTrackEvent.__airpivOriginal = original;
    window.trackEvent = bridgedTrackEvent;
    bridgeInstalled = true;
  }

  function init() {
    if (initialized || !hasAdConsent()) return;
    initialized = true;

    (function (e, t, n, s, u, a) {
      e.twq || (s = e.twq = function () {
        s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
      }, s.version = '1.1', s.queue = [], u = t.createElement(n), u.async = !0,
      u.src = 'https://static.ads-twitter.com/uwt.js',
      a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a));
    }(window, document, 'script'));

    window.twq('config', PIXEL_ID);
    installBridge();
  }

  function waitForConsent() {
    if (!initialized && hasAdConsent()) init();
    if (!bridgeInstalled) installBridge();
    if (initialized && bridgeInstalled) return;
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) window.setTimeout(waitForConsent, 500);
  }

  window.airpivXTrack = sendEvent;
  window.addEventListener('airpiv:ad-consent-granted', function () {
    init();
    installBridge();
  });

  waitForConsent();
}());
