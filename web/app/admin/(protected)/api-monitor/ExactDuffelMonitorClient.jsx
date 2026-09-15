'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const int = (n) => Number(n || 0).toLocaleString('ar-EG');
const dt = (v) => v ? new Date(v).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
const short = (v, n = 18) => !v ? '—' : String(v).length > n ? `${String(v).slice(0, n)}…` : String(v);

function Stat({ title, value, sub, danger }) {
  return <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${danger ? '#ef4444' : ADMIN_COLORS.border}`, borderRadius: 12, padding: 18 }}>
    <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>{title}</div>
    <div style={{ fontSize: 25, fontWeight: 800, marginTop: 6, color: danger ? '#ef4444' : ADMIN_COLORS.tx }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 5 }}>{sub}</div>}
  </div>;
}

export default function ExactDuffelMonitorClient() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => today());
  const [source, setSource] = useState('');
  const [trigger, setTrigger] = useState('');
  const [status, setStatus] = useState('');
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDestination, setRouteDestination] = useState('');
  const [q, setQ] = useState('');
  const [usage, setUsage] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams({ from, to, limit: '50', offset: String(offset) });
    if (source) p.set('source', source);
    if (trigger) p.set('trigger', trigger);
    if (status) p.set('status', status);
    if (routeOrigin) p.set('routeOrigin', routeOrigin);
    if (routeDestination) p.set('routeDestination', routeDestination);
    if (q) p.set('q', q);
    return p.toString();
  }, [from, to, source, trigger, status, routeOrigin, routeDestination, q, offset]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [u, a] = await Promise.all([
        fetch(`/admin/api/duffel-api-usage?${query}`),
        fetch(`/admin/api/duffel-api-attempts?${query}`),
      ]);
      const [ud, ad] = await Promise.all([u.json(), a.json()]);
      if (!u.ok || !ud.ok) throw new Error(ud.error || 'فشل تحميل إحصائيات Duffel');
      if (!a.ok || !ad.ok) throw new Error(ad.error || 'فشل تحميل سجل المحاولات');
      setUsage(ud); setAttempts(ad);
    } catch (e) { setError(e.message || 'فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const totals = usage?.totals || {};
  const maxDay = Math.max(...(usage?.daily || []).map((d) => Number(d.billable_attempts || 0)), 1);
  const sources = usage?.bySource || [];
  const totalPages = attempts ? Math.ceil(attempts.count / attempts.limit) : 0;
  const page = attempts ? Math.floor(attempts.offset / attempts.limit) + 1 : 1;

  function quick(n) { setFrom(daysAgo(n)); setTo(today()); setOffset(0); }
  function reset() { setSource(''); setTrigger(''); setStatus(''); setRouteOrigin(''); setRouteDestination(''); setQ(''); setOffset(0); }

  return <div dir="rtl">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <div><h1 style={{ fontSize: 22, margin: 0 }}>مراقبة Duffel API — التدقيق الدقيق</h1>
        <p style={{ color: ADMIN_COLORS.tx2, fontSize: 12.5, marginTop: 6 }}>كل محاولة outbound مسجلة قبل الإرسال، مع المصدر والـtrigger والمستخدم والمسار وDuffel request ID.</p></div>
      <button onClick={load} disabled={loading} style={button}>{loading ? 'جارٍ التحديث…' : '🔄 تحديث'}</button>
    </div>

    <div style={panel}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => quick(0)} style={small}>اليوم</button><button onClick={() => quick(6)} style={small}>7 أيام</button><button onClick={() => quick(29)} style={small}>30 يوم</button>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={label}>من<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} style={input} /></label>
        <label style={label}>إلى<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} style={input} /></label>
        <label style={label}>المصدر<select value={source} onChange={(e) => { setSource(e.target.value); setOffset(0); }} style={input}><option value="">الكل</option>{sources.map((x) => <option key={x.source} value={x.source}>{x.source}</option>)}</select></label>
        <label style={label}>Trigger<select value={trigger} onChange={(e) => { setTrigger(e.target.value); setOffset(0); }} style={input}><option value="">الكل</option>{[...new Set(sources.map((x) => x.trigger).filter(Boolean))].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label style={label}>الحالة<select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} style={input}><option value="">الكل</option><option value="completed">completed</option><option value="failed">failed</option><option value="timeout">timeout</option><option value="network_error">network_error</option><option value="started">started</option></select></label>
        <label style={label}>بحث<input value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} placeholder="endpoint / request ID / route" style={{ ...input, minWidth: 210 }} /></label>
        <button onClick={reset} style={small}>مسح الفلاتر</button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{error}</div>}
    </div>

    <div style={cards}>
      <Stat title="Outbound attempts" value={int(totals.outbound_attempts)} sub="عدد الطلبات الخارجة فعلياً" />
      <Stat title="Billable attempts" value={int(totals.billable_attempts)} sub="عداد محاسبة التطبيق — يُراجع مع Duffel" />
      <Stat title="Logical operations" value={int(totals.logical_operations)} sub="عملية منطقية، قد تحتوي retries" />
      <Stat title="نجاح" value={int(totals.successful_attempts)} sub={`فشل/غير مكتمل: ${int(totals.failed_or_incomplete_attempts)}`} danger={Number(totals.failed_or_incomplete_attempts) > 0} />
    </div>

    <div style={twoCol}>
      <section style={panel}><h2 style={h2}>الاستهلاك اليومي</h2>
        {(usage?.daily || []).map((d) => <div key={d.day} style={{ margin: '12px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{d.day}</span><b>{int(d.billable_attempts)} billable · {int(d.outbound_attempts)} attempts</b></div><div style={{ height: 7, background: ADMIN_COLORS.bg3, borderRadius: 5, marginTop: 5 }}><div style={{ width: `${Math.min(100, (Number(d.billable_attempts || 0) / maxDay) * 100)}%`, height: '100%', background: ADMIN_COLORS.teal, borderRadius: 5 }} /></div></div>)}
        {!usage?.daily?.length && <div style={muted}>لا توجد محاولات مسجلة ضمن الفترة.</div>}
      </section>
      <section style={panel}><h2 style={h2}>حسب المصدر والـtrigger</h2>
        <div style={{ overflowX: 'auto' }}><table style={table}><thead><tr><th>source</th><th>trigger</th><th>attempts</th><th>billable</th><th>success</th><th>failed</th></tr></thead><tbody>{sources.map((x, i) => <tr key={`${x.source}-${x.trigger}-${i}`}><td>{x.source || '—'}</td><td>{x.trigger || '—'}</td><td>{int(x.outbound_attempts)}</td><td>{int(x.billable_attempts)}</td><td>{int(x.successful_attempts)}</td><td>{int(x.failed_or_incomplete_attempts)}</td></tr>)}</tbody></table></div>
      </section>
    </div>

    {usage?.integrity && <div style={{ ...panel, marginBottom: 16 }}><h2 style={h2}>سلامة سجل التدقيق</h2><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12.5 }}><span>🟢 صفوف مقروءة: <b>{int(usage.integrity.sampled_rows)}</b></span><span style={{ color: usage.integrity.stale_started_attempts ? '#ef4444' : ADMIN_COLORS.tx2 }}>⏱ started قديمة &gt;10 دقائق: <b>{int(usage.integrity.stale_started_attempts)}</b></span><span style={{ color: usage.integrity.successful_missing_duffel_request_id ? '#ef4444' : ADMIN_COLORS.tx2 }}>⚠️ نجاح بلا Duffel request ID: <b>{int(usage.integrity.successful_missing_duffel_request_id)}</b></span></div></div>}

    <section style={panel}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}><h2 style={h2}>سجل كل محاولة outbound</h2><span style={muted}>{attempts ? `${int(attempts.count)} سجل` : ''}</span></div>
      <div style={{ overflowX: 'auto' }}><table style={table}><thead><tr><th>الوقت</th><th>المحاولة</th><th>endpoint</th><th>source / trigger</th><th>المستخدم / IP</th><th>route</th><th>status</th><th>HTTP</th><th>duration</th><th>Duffel request</th><th>error</th></tr></thead>
        <tbody>{(attempts?.rows || []).map((r) => <tr key={r.id}><td>{dt(r.started_at)}</td><td>{r.attempt_no}</td><td title={r.endpoint}>{short(r.endpoint, 28)}</td><td>{short(r.source)}<br/><span style={{ color: ADMIN_COLORS.tx3 }}>{short(r.trigger)}</span></td><td title={r.actor_user_id || ''}>{short(r.actor_user_id)}<br/><span style={{ color: ADMIN_COLORS.tx3 }}>{short(r.actor_ip)}</span></td><td>{r.route_origin || r.route_destination ? `${r.route_origin || '?'} → ${r.route_destination || '?'}` : '—'}</td><td>{r.success ? '✅ ' : ''}{r.status}</td><td>{r.http_status || '—'}</td><td>{r.duration_ms != null ? `${int(r.duration_ms)} ms` : '—'}</td><td title={r.duffel_request_id || ''}>{short(r.duffel_request_id, 24)}</td><td title={r.error_message || ''}>{short(r.error_code || r.error_message, 28)}</td></tr>)}</tbody></table></div>
      {!attempts?.rows?.length && <div style={muted}>لا توجد سجلات.</div>}
      {attempts && totalPages > 1 && <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', marginTop: 14 }}><button disabled={page <= 1} onClick={() => setOffset(Math.max(0, offset - attempts.limit))} style={small}>السابق</button><span style={muted}>صفحة {page} من {totalPages}</span><button disabled={page >= totalPages} onClick={() => setOffset(offset + attempts.limit)} style={small}>التالي</button></div>}
    </section>

    <div style={{ marginTop: 12, color: ADMIN_COLORS.tx3, fontSize: 11.5, lineHeight: 1.7 }}>ملاحظة: <b>billable attempts</b> هو عداد محاسبة داخل النظام لكل outbound attempt. لا نعتبره فاتورة Duffel؛ أي مطابقة مالية نهائية يجب أن تُراجع مع بيانات Duffel نفسها.</div>
  </div>;
}

const panel = { background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 18 };
const cards = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 16 };
const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 16 };
const h2 = { fontSize: 14, margin: '0 0 12px' };
const muted = { color: ADMIN_COLORS.tx3, fontSize: 12 };
const label = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: ADMIN_COLORS.tx2 };
const input = { border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, borderRadius: 7, padding: '8px 9px', fontSize: 12 };
const button = { border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, borderRadius: 8, padding: '9px 13px', cursor: 'pointer', fontSize: 12 };
const small = { ...button, padding: '7px 10px' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 };
