import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../../lib/admin/adminFetch';
import { getSupabaseAdmin, SUPABASE_ADMIN_UNCONFIGURED } from '../../../../../lib/admin/supabaseAdmin';

// Update (status / schedule / publish / notes) or delete a single queued post.
export const dynamic = 'force-dynamic';

const VALID_STATUS = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'];

export async function PATCH(request, { params }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: SUPABASE_ADMIN_UNCONFIGURED }, { status: 503 });
  const { id } = await params;

  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 }); }

  // Only these fields are mutable post-creation (the copy is regenerated, not
  // hand-edited, in this increment).
  const patch = {};
  if (b.status !== undefined) {
    if (!VALID_STATUS.includes(b.status)) return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
    patch.status = b.status;
  }
  if (b.scheduled_at !== undefined) patch.scheduled_at = b.scheduled_at || null;
  if (b.published_at !== undefined) patch.published_at = b.published_at || null;
  if (b.external_url !== undefined) patch.external_url = b.external_url || null;
  if (b.notes !== undefined) patch.notes = b.notes || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });

  const { data, error } = await db.from('social_posts').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, post: data });
}

export async function DELETE(request, { params }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: SUPABASE_ADMIN_UNCONFIGURED }, { status: 503 });
  const { id } = await params;

  const { error } = await db.from('social_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
