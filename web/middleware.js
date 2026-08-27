// ─────────────────────────────────────────────────────────────
// Edge bot guard — runs BEFORE any Route Handler (i.e. before the
// flight-route SEO pages render), so an unwanted crawler is refused at the
// edge and never burns Fluid Active CPU generating a page. This is the
// firewall layer robots.txt can't provide: robots.txt is advisory, this is
// enforced.
//
// Design rules (see the audit):
//   • NEVER block the search engines we actually want (Googlebot, Bingbot,
//     Applebot, DuckDuckBot, …). They are allow-listed explicitly so no future
//     tightening accidentally catches them, and they mostly hit the ISR cache
//     anyway (a repeat crawl of the same URL is served from cache, ~0 CPU).
//   • Hard-block the aggressive crawlers that bring no value to our target
//     search engines and caused the Aug 16–18 CPU spike.
//   • Everything else (real users, unknown agents) passes through untouched.
//   • Duffel is never involved in a page render (proven in the audit), so this
//     layer is purely about Vercel CPU, not API cost.
//
// NOTE on Googlebot verification: the edge runtime can't do reverse-DNS, so the
// allow-list is user-agent based. That is safe here because "allow" grants no
// privilege — a spoofed Googlebot only receives the same public, cache-served
// HTML any visitor gets. Reverse-DNS / IP verification belongs at the Vercel
// WAF layer (see vercel-waf-rules in the audit) if stricter proof is wanted.

import { NextResponse } from 'next/server';

// Refused at the edge with 403. Matched case-insensitively as substrings of the
// User-Agent. These are crawlers/scrapers with no SEO value for us.
const BLOCKED_BOTS = [
  'bytespider',     // ByteDance / TikTok — extremely aggressive
  'petalbot',       // Huawei / Petal
  'dotbot',         // Moz
  'ahrefsbot',      // Ahrefs (switch to allow later if we buy Ahrefs)
  'semrushbot',     // Semrush (switch to allow later if we buy Semrush)
  'amazonbot',      // Amazon — not needed for our SEO
  'mj12bot',        // Majestic
  'dataforseo',     // DataForSEO
  'blexbot',        // WebMeUp
  'megaindex',
  'seokicks',
  'serpstatbot',
  'zoominfobot',
  'barkrowler',
  'imagesiftbot',
  'gptbot',         // OpenAI training crawler (not a search engine)
  'ccbot',          // CommonCrawl
  'claudebot',      // Anthropic training crawler
  'meta-externalagent',
];

// Always allowed through, whatever any future rule does. Real search engines +
// their verification/inspection tools.
const ALLOWED_BOTS = [
  'googlebot', 'google-inspectiontool', 'storebot-google', 'google-extended',
  'apis-google', 'mediapartners-google', 'adsbot-google',
  'bingbot', 'adidxbot', 'microsoftpreview',
  'applebot', 'duckduckbot', 'yandexbot', 'baiduspider',
];

function classify(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return { kind: 'unknown', bot: null };
  for (const b of ALLOWED_BOTS) if (s.includes(b)) return { kind: 'search', bot: b };
  for (const b of BLOCKED_BOTS) if (s.includes(b)) return { kind: 'blocked', bot: b };
  return { kind: s.includes('bot') || s.includes('crawler') || s.includes('spider') ? 'otherbot' : 'human', bot: null };
}

export function middleware(req) {
  const ua = req.headers.get('user-agent') || '';
  const { kind, bot } = classify(ua);
  const path = req.nextUrl.pathname;

  if (kind === 'blocked') {
    // Structured, no sensitive data — greppable in Vercel logs / analytics.
    console.log(JSON.stringify({ tag: 'bot-guard', decision: 'block', bot, path }));
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'content-type': 'text/plain', 'x-bot-guard': 'blocked', 'cache-control': 'no-store' },
    });
  }

  // Tag search-engine + other-bot traffic so it's countable in logs/analytics,
  // then let it through. Humans pass silently to keep the log signal clean.
  if (kind === 'search' || kind === 'otherbot') {
    console.log(JSON.stringify({ tag: 'bot-guard', decision: 'allow', kind, bot, path }));
    const res = NextResponse.next();
    res.headers.set('x-bot-guard', kind === 'search' ? 'search' : 'otherbot');
    return res;
  }

  return NextResponse.next();
}

// Run on real page navigations only — skip Next internals, the API proxy, and
// static assets so the guard adds no overhead to those.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|api/|favicon.ico|robots.txt|sitemap|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|xml|txt|json)$).*)',
  ],
};
