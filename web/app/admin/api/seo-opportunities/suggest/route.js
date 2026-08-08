import { NextResponse } from 'next/server';
import { adminFetch, getAdminSession } from '../../../../../lib/admin/adminFetch';
import suggestMod from '../../../../../lib/seo/suggest.js';

// [Phase 15/16] Generate a BEFORE / PROPOSED SEO optimization for one route.
//
// SECURITY: this route holds NO secret. The Claude call happens on the trusted
// backend (Render, api.airpiv.com), which is the only place ANTHROPIC_API_KEY
// lives. This handler only PROXIES the route's already-extracted, non-secret
// page signals to POST /admin/seo/optimize (via adminFetch, which carries the
// admin session token) and returns the recommendations. The API key never
// reaches Vercel, the browser, or any response body.
//
// Resilience: if the backend is unreachable, not yet deployed, or reports the AI
// path unavailable, this falls back to the deterministic, key-free rule engine
// (lib/seo/suggest.js) so the feature keeps working during rollout — the `note`
// field surfaces why the AI path was skipped. READ-ONLY: proposes only, applies
// nothing.
const { buildOptimizationSuggestions } = suggestMod;

export const dynamic = 'force-dynamic';

function ruleFallback({ elements, gsc, dominantIntent, lang }) {
  return buildOptimizationSuggestions({
    elements: elements || {},
    gsc: gsc || null,
    dominantIntent: dominantIntent || null,
    lang: lang || 'de',
  });
}

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const elements = payload && payload.elements;
  if (!elements || typeof elements !== 'object') {
    return NextResponse.json({ ok: false, error: 'Missing page elements' }, { status: 400 });
  }
  const lang = typeof payload.lang === 'string' ? payload.lang : (typeof payload.language === 'string' ? payload.language : 'de');
  const dominantIntent = typeof payload.dominantIntent === 'string' ? payload.dominantIntent : null;
  const gsc = payload.gsc && typeof payload.gsc === 'object' ? payload.gsc : null;
  const slug = typeof payload.slug === 'string' ? payload.slug : null;

  // Primary path: the trusted backend calls Claude with the key that lives ONLY
  // on Render. This handler never holds or sees that key.
  try {
    const res = await adminFetch('/admin/seo/optimize', {
      method: 'POST',
      body: JSON.stringify({ elements, gsc, dominantIntent, language: lang, slug }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.source === 'ai' && data.suggestions) {
        return NextResponse.json({ ok: true, source: 'ai', model: data.model || null, suggestions: data.suggestions });
      }
      // Backend reachable but the AI path was unavailable/unsupported → rules.
      const reason = data && data.reason ? data.reason : (data && data.source) || 'unavailable';
      return NextResponse.json({ ok: true, source: 'rules', note: `AI ${reason}; used rules.`, suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
    }
    // Non-2xx (e.g. backend not yet deployed, 401/404/5xx) → rules fallback.
    return NextResponse.json({ ok: true, source: 'rules', note: `backend ${res.status}; used rules.`, suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
  } catch {
    // Backend unreachable (network) → deterministic rules keep the UI working.
    return NextResponse.json({ ok: true, source: 'rules', note: 'backend unreachable; used rules.', suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
  }
}
