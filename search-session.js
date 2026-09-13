/* Search Session bootstrap — no UI. Issues a short-lived token after
   (optional) Turnstile and attaches X-Search-Session on /search and
   /search/airports. Guests can still search without an account. */
(function () {
  var TOKEN_KEY = 'fw_search_session';
  var EXP_KEY = 'fw_search_session_exp';
  var PROXY = 'https://api.airpiv.com';
  var inflight = null;
  var origFetch = window.fetch;

  function siteKey() {
    return (window.APP_CONFIG && window.APP_CONFIG.TURNSTILE_SITE_KEY) || '';
  }

  function storedToken() {
    try {
      var t = sessionStorage.getItem(TOKEN_KEY);
      var exp = parseInt(sessionStorage.getItem(EXP_KEY) || '0', 10);
      if (t && exp > (Date.now() / 1000) + 60) return t;
    } catch (e) { /* private mode */ }
    return null;
  }

  function saveToken(token, exp) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(EXP_KEY, String(exp || 0));
    } catch (e) { /* ignore */ }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXP_KEY);
    } catch (e) { /* ignore */ }
  }

  function loadTurnstile() {
    var key = siteKey();
    if (!key) return Promise.resolve(null);
    if (window.turnstile) return Promise.resolve(window.turnstile);
    return new Promise(function (resolve) {
      var existing = document.querySelector('script[data-fw-turnstile]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.turnstile || null); });
        existing.addEventListener('error', function () { resolve(null); });
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.setAttribute('data-fw-turnstile', '1');
      s.onload = function () { resolve(window.turnstile || null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  function getTurnstileToken() {
    var key = siteKey();
    if (!key) return Promise.resolve(null);
    return loadTurnstile().then(function (ts) {
      if (!ts || typeof ts.render !== 'function') return null;
      return new Promise(function (resolve) {
        var el = document.getElementById('fw-cf-turnstile');
        if (!el) {
          el = document.createElement('div');
          el.id = 'fw-cf-turnstile';
          el.setAttribute('aria-hidden', 'true');
          el.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);';
          document.body.appendChild(el);
        }
        var done = false;
        var finish = function (token) {
          if (done) return;
          done = true;
          resolve(token || null);
        };
        try {
          var widgetId = ts.render(el, {
            sitekey: key,
            size: 'invisible',
            callback: finish,
            'error-callback': function () { finish(null); },
            'expired-callback': function () { finish(null); },
          });
          if (typeof ts.execute === 'function') ts.execute(widgetId);
          setTimeout(function () { finish(null); }, 8000);
        } catch (e) {
          finish(null);
        }
      });
    });
  }

  function issueSession() {
    if (inflight) return inflight;
    inflight = getTurnstileToken().then(function (tsToken) {
      var body = {};
      if (tsToken) body.turnstile_token = tsToken;
      return origFetch.call(window, PROXY + '/search/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (r) { return r.json(); });
    }).then(function (j) {
      inflight = null;
      if (j && j.ok && j.token) {
        saveToken(j.token, j.expires_at);
        return j.token;
      }
      return null;
    }).catch(function () {
      inflight = null;
      return null;
    });
    return inflight;
  }

  function ensureSession() {
    var t = storedToken();
    if (t) return Promise.resolve(t);
    return issueSession();
  }

  function isGuarded(url) {
    var u = String(url || '');
    if (u.indexOf('/search/session') !== -1) return false;
    if (u.indexOf('/search/airports') !== -1) return true;
    return /\/search(?:\?|$)/.test(u);
  }

  function withSessionHeader(init, token) {
    var next = init ? Object.assign({}, init) : {};
    var headers = new Headers(next.headers || {});
    if (token) headers.set('X-Search-Session', token);
    next.headers = headers;
    return next;
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!isGuarded(url)) return origFetch.call(window, input, init);
    return ensureSession().then(function (token) {
      return origFetch.call(window, input, withSessionHeader(init, token)).then(function (res) {
        if (res.status !== 403) return res;
        clearToken();
        return issueSession().then(function (t2) {
          return origFetch.call(window, input, withSessionHeader(init, t2));
        });
      });
    });
  };

  window.ensureSearchSession = ensureSession;

  function prefetch() { ensureSession(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetch);
  } else {
    prefetch();
  }
})();
