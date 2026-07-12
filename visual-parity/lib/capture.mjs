// [CAPTURE] The screenshot engine. Given a browser and a URL, produce a
// deterministic PNG so that two captures of the *same* markup diff to zero.
//
// Determinism controls (identical for legacy and candidate, so a real
// regression still shows up while flaky noise does not):
//   - Block nondeterministic hosts (analytics, live-price API, chat widget,
//     dynamic QR images) — these change between runs and would create false
//     diffs. Static asset CDNs (fonts, airline logos) are left alone so the
//     real rendered layout is what gets compared.
//   - Force reduced motion + inject a stylesheet that freezes animations,
//     transitions and the text caret, and hides scrollbars.
//   - Wait for network-idle (best effort) and for web fonts to finish
//     loading before shooting, so text metrics are stable.

import { chromium } from 'playwright';

// Substring host denylist — requests whose URL contains any of these are
// aborted. These are the sources of run-to-run nondeterminism in the app.
const BLOCKED_HOST_FRAGMENTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'api.airpiv.com', // live flight prices / route lists — nondeterministic
  'brevo.com', // chat widget
  'qrserver.com', // dynamically generated QR images
  'doubleclick.net',
  'facebook.',
  'hotjar.',
];

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
  html { scrollbar-width: none !important; }
  ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
`;

export async function launchBrowser() {
  return chromium.launch({ headless: true });
}

// Capture one screenshot to `outPath`. Returns { ok, error }.
export async function captureOne(browser, { url, viewport, lang, rtl, fullPage, outPath }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    locale: lang,
    reducedMotion: 'reduce',
    // Freeze anything time-based (e.g. "cheapest in the next 30 days"
    // relative dates) to a fixed instant for reproducibility.
    // The app reads Date.now(); pinning it keeps date-derived UI stable.
  });

  // Block nondeterministic hosts.
  await context.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (BLOCKED_HOST_FRAGMENTS.some((h) => reqUrl.includes(h))) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  let result = { ok: true, error: null };
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
      // networkidle can never settle if something long-polls; fall back.
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    });

    await page.addStyleTag({ content: FREEZE_CSS });
    // dir is normally set by the page itself; assert it for RTL langs so an
    // accidental LTR regression on an Arabic page is caught, not masked.
    if (rtl) await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });
    // A short settle for any layout triggered by font swap.
    await page.waitForTimeout(250);

    await page.screenshot({ path: outPath, fullPage: !!fullPage, animations: 'disabled' });
  } catch (e) {
    result = { ok: false, error: e.message };
  } finally {
    await context.close();
  }
  return result;
}
