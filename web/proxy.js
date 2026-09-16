// ─────────────────────────────────────────────────────────────
// Bot guard (Next.js Proxy — the file convention formerly called
// `middleware`, renamed in Next 16). Runs before Route Handlers so unwanted
// crawlers are refused before a page render can consume application CPU.
//
// Policy:
//   • Explicitly allow the search/SEO bots we need.
//   • Explicitly block known unwanted crawlers/scrapers.
//   • Block any other request that clearly identifies itself as a bot/crawler/
//     spider. This is intentional: Airpiv is a public SEO site, but we do not
//     need arbitrary crawlers consuming its flight-page compute/bandwidth.
//   • Ordinary browser traffic passes untouched.
//
// IMPORTANT: this is an application-layer backstop. Vercel Firewall/Bot
// Protection should remain the primary edge layer because it can challenge or
// deny traffic before it reaches the application. This proxy exists so known
// bad/unknown bots are also stopped if they reach the app.

import { NextResponse } from 'next/server';

// Refused with 403. Matched case-insensitively as substrings of the User-Agent.
const BLOCKED_BOTS = [
  'bytespider',
  'petalbot',
  'dotbot',
  'ahrefsbot',
  'semrushbot',
  'amazonbot',
  'mj12bot',
  'dataforseo',
  'blexbot',
  'megaindex',
  'seokicks',
  'serpstatbot',
  'zoominfobot',
  'barkrowler',
  'imagesiftbot',
  'gptbot',
  'ccbot',
  'claudebot',
  'meta-externalagent',
];

// Search engines and trusted SEO/inspection bots that Airpiv explicitly wants to crawl.
const ALLOWED_BOTS = [
  'googlebot',
  'google-inspectiontool',
  'storebot-google',
  'google-extended',
  'apis-google',
  'mediapartners-google',
  'adsbot-google',
  'bingbot',
  'adidxbot',
  'microsoftpreview',
  'applebot',
  'duckduckbot',
  'yandexbot',
  'baiduspider',
  // Used only by our trusted technical SEO audit service; it does not trigger
  // flight search/API calls and is needed to verify the same HTML Google sees.
  'gscwizard-bot',
];

function classify(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return { kind: 'unknown', bot: null };
  for (const b of ALLOWED_BOTS) {
    if (s.includes(b)) return { kind: 'search', bot: b };
  }
  for (const b of BLOCKED_BOTS) {
    if (s.includes(b)) return { kind: 'blocked', bot: b };
  }
  if (s.includes('bot') || s.includes('crawler') || s.includes('spider')) {
    return { kind: 'otherbot', bot: null };
  }
  return { kind: 'human', bot: null };
}

export function proxy(req) {
  const ua = req.headers.get('user-agent') || '';
  const { kind, bot } = classify(ua);
  const path = req.nextUrl.pathname;

  if (kind === 'blocked' || kind === 'otherbot') {
    console.log(JSON.stringify({
      tag: 'bot-guard',
      decision: 'block',
      kind,
      bot,
      path,
    }));
    return new NextResponse('Forbidden', {
      status: 403,
      headers: {
        'content-type': 'text/plain',
        'x-bot-guard': 'blocked',
        'cache-control': 'no-store',
      },
    });
  }

  if (kind === 'search') {
    console.log(JSON.stringify({
      tag: 'bot-guard',
      decision: 'allow',
      kind,
      bot,
      path,
    }));
    const res = NextResponse.next();
    res.headers.set('x-bot-guard', 'search');
    return res;
  }

  return NextResponse.next();
}

// Run on real page navigations only — skip Next internals, APIs and static
// assets so the guard adds no unnecessary work there.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|api/|favicon.ico|robots.txt|sitemap|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|xml|txt|json)$).*)',
  ],
};
