import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../../lib/admin/adminFetch';
import { getServiceClient, isStorageConfigured } from '../../../../../lib/seo/supabase-server';
import gscMod from '../../../../../lib/seo/gsc-opportunity.js';

// [Phase 2 + 17] Per-route SEO optimization lifecycle state (status + last
// analyzed/optimized timestamps), persisted in Supabase so it is shared across
// devices/staff. Admin-gated; service-role only. Never touches page content —
// this is purely the operator's workflow state.
const { STATUS_VALUES } = gscMod;
const STATUS_SET = new Set(STATUS_VALUES);
const TABLE = 'seo_route_status';
const SLUG_RE = /^[a-z0-9-]{2,80}$/i;

export const dynamic = 'force-dynamic';

// GET → all status rows as a map keyed by slug (language kept on each entry).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isStorageConfigured()) return NextResponse.json({ ok: true, configured: false, statuses: {} });

  const db = getServiceClient();
  const { data, error } = await db
    .from(TABLE)
    .select('slug, language, status, last_analyzed_at, last_optimized_at, updated_by, updated_at');
  if (error) return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });

  const statuses = {};
  for (const r of data || []) {
    statuses[r.slug] = {
      status: r.status,
      language: r.language,
      lastAnalyzedAt: r.last_analyzed_at,
      lastOptimizedAt: r.last_optimized_at,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    };
  }
  return NextResponse.json({ ok: true, configured: true, statuses });
}

// POST → upsert one route's status. Body: { slug, language?, status?,
// markAnalyzed?, markOptimized? }. Only the fields provided are changed.
export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isStorageConfigured()) return NextResponse.json({ ok: true, configured: false, saved: false });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  const slug = (body && body.slug || '').trim();
  if (!SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });
  if (body.status != null && !STATUS_SET.has(body.status)) {
    return NextResponse.json({ ok: false, error: `Invalid status (allowed: ${STATUS_VALUES.join(', ')})` }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const record = {
    slug,
    language: typeof body.language === 'string' && body.language ? body.language.slice(0, 8) : 'de',
    updated_by: session.name || session.role || null,
    updated_at: nowIso,
  };
  if (body.status != null) record.status = body.status;
  if (body.markAnalyzed) record.last_analyzed_at = nowIso;
  if (body.markOptimized) record.last_optimized_at = nowIso;

  const db = getServiceClient();
  const { data, error } = await db
    .from(TABLE)
    .upsert(record, { onConflict: 'slug,language' })
    .select('slug, language, status, last_analyzed_at, last_optimized_at, updated_by, updated_at')
    .single();
  if (error) return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    configured: true,
    saved: true,
    status: {
      status: data.status,
      language: data.language,
      lastAnalyzedAt: data.last_analyzed_at,
      lastOptimizedAt: data.last_optimized_at,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
    },
  });
}
