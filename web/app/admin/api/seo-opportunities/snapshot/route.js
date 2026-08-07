import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../../lib/admin/adminFetch';
import { getServiceClient, isStorageConfigured, SNAPSHOT_TABLE } from '../../../../../lib/seo/supabase-server';

// [SEO-STORAGE] Persist the SEO opportunity report to Supabase so it is shared
// across devices/staff and survives a browser wipe — not just cached in one
// operator's localStorage. Every request is admin-gated (session cookie) and
// every DB call runs through the service-role client, which is the only thing
// allowed past this table's RLS. When storage isn't configured (no service-role
// key in env) both verbs answer `configured:false` and the client falls back to
// its local cache — the feature never hard-breaks.
export const dynamic = 'force-dynamic';

const MAX_ROWS = 5000; // cap the stored blob; a full GSC page export is well under this

// Latest snapshot (the current report).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (!isStorageConfigured()) return NextResponse.json({ ok: true, configured: false, snapshot: null });
  const db = getServiceClient();
  const { data, error } = await db
    .from(SNAPSHOT_TABLE)
    .select('id, created_at, source, file_name, date_range, row_count, rows, uploaded_by')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: true, snapshot: data || null });
}

// Save a new snapshot. Body: { rows, source, fileName, dateRange }.
export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (!isStorageConfigured()) return NextResponse.json({ ok: true, configured: false, saved: false });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  const rows = Array.isArray(body && body.rows) ? body.rows : null;
  if (!rows || !rows.length) return NextResponse.json({ ok: false, error: 'rows required' }, { status: 400 });

  const capped = rows.slice(0, MAX_ROWS);
  const record = {
    source: body.source === 'api' ? 'api' : 'csv',
    file_name: typeof body.fileName === 'string' ? body.fileName.slice(0, 255) : null,
    date_range: typeof body.dateRange === 'string' ? body.dateRange.slice(0, 255) : null,
    row_count: capped.length,
    rows: capped,
    uploaded_by: session.name || session.role || null,
  };

  const db = getServiceClient();
  const { data, error } = await db.from(SNAPSHOT_TABLE).insert(record).select('id, created_at').single();
  if (error) return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: true, saved: true, id: data.id, created_at: data.created_at });
}
