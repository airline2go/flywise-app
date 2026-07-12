(function(){
  var base='https://airpiv.com';
  // [HREFLANG-CANONICAL-FIX] Each language's URL must be canonical to
  // ITSELF, not silently collapsed back to the bare URL — otherwise the
  // hreflang tags above (which claim /en and /ar are distinct,
  // self-referencing indexable pages) directly contradict the canonical
  // tag, telling Google "ignore the language-specific URL, this is
  // really just the default page" — exactly defeating the purpose of
  // having hreflang tags at all. Canonical is derived from the clean
  // pathname only (never a query string) — matches the no-trailing-slash
  // convention used by every other clean URL on the site (e.g. /city/berlin).
  var path=window.location.pathname;
  var homeVariants=['/en','/ar','/es','/fr','/it','/nl'];
  var canonical=(homeVariants.indexOf(path)!==-1)?base+path:base+'/';
  document.getElementById('canonical-url').setAttribute('href',canonical);
})();
