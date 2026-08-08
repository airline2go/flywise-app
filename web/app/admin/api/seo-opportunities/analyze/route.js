import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../../lib/admin/adminFetch';
import analyzeMod from '../../../../../lib/seo/analyze-page.js';

// [SEO-ANALYZE Phase 3] Fetches the REAL rendered route page from the live site
// and returns a read-only SEO analysis (extracted elements + multi-factor score
// + factual flags). It changes nothing and proposes nothing — analysis only.
// Admin-gated. Only airpiv.com /flights/<slug> URLs are fetched.
const { analyzeRoutePage } = analyzeMod;

export const dynamic = 'force-dynamic';
// Fetching the live page (12s abort) plus a possibly-cold backend can exceed the
// default function limit; give it headroom so the request isn't cut off.
export const maxDuration = 30;

const SITE = 'https://airpiv.com';
const KNOWN_LANGS = new Set(['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);
const SLUG_RE = /^[a-z0-9-]{2,80}$/i;

function buildUrl(slug, lang) {
  const prefix = lang && lang !== 'de' && KNOWN_LANGS.has(lang) ? `/${lang}` : '';
  return `${SITE}${prefix}/flights/${encodeURIComponent(slug)}`;
}

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') || '').trim();
  const lang = (searchParams.get('lang') || 'de').trim();
  if (!SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });

  const url = buildUrl(slug, KNOWN_LANGS.has(lang) ? lang : 'de');

  // Fetch the live page with a hard timeout so a slow origin can't hang the route.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let html;
  let status;
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'AirpivSEO-Analyzer/1.0' }, cache: 'no-store' });
    status = res.status;
    if (res.status === 404) return NextResponse.json({ ok: false, error: 'Route page not found (404)', url }, { status: 404 });
    if (!res.ok) return NextResponse.json({ ok: false, error: `Fetch failed (${res.status})`, url }, { status: 502 });
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.name === 'AbortError' ? 'Fetch timed out' : 'Fetch error', url }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }

  // Optional GSC row for the query/CTR factors, forwarded by the client from the
  // already-loaded report (never re-fetched or invented here).
  const gsc = {};
  for (const k of ['impressions', 'clicks', 'position']) {
    const v = searchParams.get(k);
    gsc[k] = v == null || v === '' ? (k === 'clicks' ? null : undefined) : Number(v);
  }
  const hasGsc = Number.isFinite(gsc.impressions) || Number.isFinite(gsc.position);

  const analysis = analyzeRoutePage({ html, slug, lang, url, gsc: hasGsc ? gsc : null });
  return NextResponse.json({ ok: true, status, ...analysis });
}
