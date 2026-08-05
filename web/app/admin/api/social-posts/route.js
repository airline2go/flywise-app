import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../lib/admin/adminFetch';
import { getSupabaseAdmin, SUPABASE_ADMIN_UNCONFIGURED } from '../../../../lib/admin/supabaseAdmin';

// Social Studio queue. Reads/writes go straight to the social_posts table via
// the service-role client (this feature is owned by the frontend, unlike the
// blog/routes admin which proxy to flywise-server). Gated on an admin session
// cookie being present — the same bar the (protected) layout uses for pages.
export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'];

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, posts: [], unconfigured: SUPABASE_ADMIN_UNCONFIGURED });

  const status = new URL(request.url).searchParams.get('status');
  let q = db.from('social_posts').select('*').order('created_at', { ascending: false }).limit(200);
  if (status && VALID_STATUS.includes(status)) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message, posts: [] }, { status: 500 });
  return NextResponse.json({ ok: true, posts: data || [] });
}

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: SUPABASE_ADMIN_UNCONFIGURED }, { status: 503 });

  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 }); }

  const row = {
    status: VALID_STATUS.includes(b.status) ? b.status : 'draft',
    platform: b.platform,
    language: b.language,
    template_type: b.template_type,
    subject_type: b.subject_type || null,
    subject_ref: b.subject_ref || null,
    title: b.title || null,
    body: b.body,
    hashtags: Array.isArray(b.hashtags) ? b.hashtags.slice(0, 40).map(String) : [],
    cta_label: b.cta_label || null,
    cta_url: b.cta_url || null,
    image_brief: b.image_brief || null,
    scheduled_at: b.scheduled_at || null,
    created_by: session.name || session.role || null,
    notes: b.notes || null,
  };
  if (!row.platform || !row.language || !row.template_type || !row.body) {
    return NextResponse.json({ ok: false, error: 'missing required fields (platform, language, template_type, body)' }, { status: 400 });
  }

  const { data, error } = await db.from('social_posts').insert(row).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, post: data });
}
