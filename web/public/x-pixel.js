/*
 * Airpiv X Pixel base tag.
 *
 * This file intentionally does not load X until advertising consent is true.
 * It also waits for consent.js so a stored choice and a choice made after the
 * banner appears are handled without duplicate initialization.
 */
(function () {
  'use strict';

  var PIXEL_ID = 'rf8jx';
  var initialized = false;
  var attempts = 0;
  var MAX_ATTEMPTS = 600;

  function hasAdConsent() {
    try {
      return typeof window.airpivHasAdConsent === 'function' && window.airpivHasAdConsent();
    } catch (e) {
      return false;
    }
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
  }

  function waitForConsent() {
    if (initialized) return;
    if (hasAdConsent()) {
      init();
      return;
    }
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) window.setTimeout(waitForConsent, 500);
  }

  waitForConsent();
}());
