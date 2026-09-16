/*
 * Airpiv X Pixel.
 *
 * Loads only after advertising consent. The existing web app already has a
 * single trackEvent() layer (GA4/local stats). This file bridges those events
 * to X without modifying the booking/search code or sending passenger PII.
 *
 * IMPORTANT: X conversion event IDs are intentionally NOT invented here.
 * Populate window.AIRPIV_X_EVENT_IDS from verified X Events Manager IDs when
 * they exist. Until then, the X base tag still records Site Visit/Landing Page
 * View, while app events remain available to the local/GA4 analytics layer.
 */
(function () {
  'use strict';

  var PIXEL_ID = 'rf8jx';
  var initialized = false;
  var bridgeInstalled = false;
  var attempts = 0;
  var MAX_ATTEMPTS = 600;

  // Map the app's existing event names to X conversion-event slots.
  // Values stay null until the real X event IDs are supplied from Events Manager.
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
    var merged = {};
    var k;
    for (k in EVENT_IDS) {
      if (Object.prototype.hasOwnProperty.call(EVENT_IDS, k)) merged[k] = EVENT_IDS[k];
    }
    for (k in configured) {
      if (Object.prototype.hasOwnProperty.call(configured, k) && typeof configured[k] === 'string' && configured[k].trim()) {
        merged[k] = configured[k].trim();
      }
    }
    return merged;
  }

  function cleanParams(params) {
    params = params && typeof params === 'object' ? params : {};
    var out = {};
    var allow = {
      value: 1,
      currency: 1,
      conversion_id: 1,
      transaction_id: 1,
      search_string: 1,
      description: 1,
      content_type: 1,
      content_id: 1,
      content_name: 1,
      content_price: 1,
      num_items: 1,
      origin: 1,
      destination: 1,
      departure_date: 1,
      return_date: 1,
      trip_type: 1,
      results_count: 1,
      offer_id: 1,
      order_id: 1,
      booking_reference: 1,
      reason: 1,
      status: 1
    };
    var k;
    for (k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k) || !allow[k]) continue;
      var v = params[k];
      if (v === null || v === undefined || typeof v === 'function') continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    }
    // X calls this the deduplication key. Reuse the already existing booking
    // transaction/order identifier when one exists; never generate fake IDs.
    if (!out.conversion_id) {
      if (out.transaction_id) out.conversion_id = String(out.transaction_id);
      else if (out.order_id) out.conversion_id = String(out.order_id);
      else if (out.booking_reference) out.conversion_id = String(out.booking_reference);
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
      var payload = cleanParams(params);
      window.twq('event', eventId, payload);
    } catch (e) {
      // Tracking must never affect the booking flow.
    }
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
