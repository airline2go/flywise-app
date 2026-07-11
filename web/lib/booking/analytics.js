'use client';

// Ports app.js's trackEvent() wrapper — analytics.js (loaded via
// RootLayoutChrome's <Script>) defines the global `gtag` function this
// calls into. Safe to call before analytics.js has loaded (gtag simply
// won't exist yet) or in any environment without GA.
function trackEvent(name, params) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params || {});
  }
}

export { trackEvent };
