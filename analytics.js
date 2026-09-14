window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "G-2K257GSWEM");

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
