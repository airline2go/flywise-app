'use client';

// [CONTENT-CALENDAR] Visual monthly calendar for the Social Studio queue.
// Reads the social_posts queue, places each post on its scheduled day, colours
// it by status, filters by platform/language/status, and lets you reschedule by
// drag-and-drop (or by dropping an unscheduled post onto a day). All on the
// existing /admin/api/social-posts endpoints — no new backend.
import { useState, useMemo, useEffect, useCallback } from 'react';
import { ADMIN_COLORS as C } from '../../../../lib/admin/theme';
import generatorMod from '../../../../lib/social/generator';
import calendarMod from '../../../../lib/social/calendar';

const { PLATFORMS, LANGUAGES } = generatorMod;
const { monthGrid, bucketByDate, isoDate } = calendarMod;

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DOW = ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];
const STATUS_COLOR = {
  draft: C.tx3, pending_review: C.yellow, approved: C.blue,
  scheduled: C.teal, published: '#16a34a', failed: C.red,
};
const STATUS_LABEL = { draft: 'مسودة', pending_review: 'مراجعة', approved: 'معتمد', scheduled: 'مجدول', published: 'منشور', failed: 'فشل' };
const PLATFORM_KEYS = Object.keys(PLATFORMS);

const selStyle = { padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg2, color: C.tx, fontSize: 12.5, fontFamily: 'inherit' };
const btn = (bg, fg) => ({ padding: '6px 12px', borderRadius: 8, border: 'none', background: bg, color: fg, fontSize: 13, fontWeight: 700, cursor: 'pointer' });

export default function ContentCalendarClient() {
  const now = new Date();
  const [posts, setPosts] = useState([]);
  const [note, setNote] = useState('جارٍ التحميل…');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [fPlatform, setFPlatform] = useState('');
  const [fLang, setFLang] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [dragId, setDragId] = useState(null);

  const load = useCallback(() => {
    fetch('/admin/api/social-posts')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setPosts(d.posts || []); setNote(d.unconfigured || ''); }
        else setNote(d.error || 'تعذّر التحميل.');
      })
      .catch(() => setNote('تعذّر التحميل.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => posts.filter((p) =>
    (!fPlatform || p.platform === fPlatform) &&
    (!fLang || p.language === fLang) &&
    (!fStatus || p.status === fStatus)), [posts, fPlatform, fLang, fStatus]);

  const { map, unscheduled } = useMemo(() => bucketByDate(filtered), [filtered]);
  const weeks = useMemo(() => monthGrid(year, month), [year, month]);
  const todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const move = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y);
  };

  const reschedule = useCallback((id, iso) => {
    if (!id) return;
    const scheduled_at = new Date(`${iso}T12:00:00`).toISOString();
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, scheduled_at, status: p.status === 'draft' || p.status === 'pending_review' ? 'scheduled' : p.status } : p)));
    fetch(`/admin/api/social-posts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at, status: 'scheduled' }),
    }).then((r) => r.json()).then((d) => { if (d.ok && d.post) setPosts((ps) => ps.map((p) => (p.id === id ? d.post : p))); }).catch(() => {});
  }, []);

  const chip = (p) => (
    <div
      key={p.id}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); setDragId(p.id); }}
      onDragEnd={() => setDragId(null)}
      title={`${(PLATFORMS[p.platform] && PLATFORMS[p.platform].label) || p.platform} · ${STATUS_LABEL[p.status] || p.status}\n${p.body || ''}`}
      style={{ fontSize: 10.5, lineHeight: 1.3, padding: '2px 5px', borderRadius: 5, marginBottom: 3, cursor: 'grab',
        background: 'rgba(255,255,255,0.04)', borderInlineStart: `3px solid ${STATUS_COLOR[p.status] || C.tx3}`,
        color: C.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: dragId === p.id ? 0.4 : 1 }}
    >
      {(PLATFORMS[p.platform] && PLATFORMS[p.platform].label) || p.platform} · {String(p.language).toUpperCase()}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0, color: C.tx }}>تقويم المحتوى</h1>
          <p style={{ fontSize: 13, color: C.tx2, margin: '4px 0 0' }}>اسحب أي منشور إلى يوم لإعادة جدولته. الألوان حسب الحالة.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btn(C.bg3, C.tx)} onClick={() => move(-1)}>‹</button>
          <strong style={{ fontSize: 15, color: C.tx, minWidth: 120, textAlign: 'center' }}>{MONTHS[month]} {year}</strong>
          <button style={btn(C.bg3, C.tx)} onClick={() => move(1)}>›</button>
          <button style={btn(C.bg3, C.tx2)} onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>اليوم</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={selStyle} value={fPlatform} onChange={(e) => setFPlatform(e.target.value)}>
          <option value="">كل المنصات</option>
          {PLATFORM_KEYS.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
        </select>
        <select style={selStyle} value={fLang} onChange={(e) => setFLang(e.target.value)}>
          <option value="">كل اللغات</option>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <select style={selStyle} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button style={btn(C.bg3, C.tx2)} onClick={load}>تحديث</button>
      </div>

      {note && <p style={{ fontSize: 12.5, color: C.yellow, margin: '0 0 12px' }}>{note}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {DOW.map((d) => <div key={d} style={{ fontSize: 11.5, color: C.tx3, textAlign: 'center', padding: '2px 0' }}>{d}</div>)}
        {weeks.flat().map((cell) => {
          const dayPosts = map[cell.iso] || [];
          const isToday = cell.iso === todayIso;
          return (
            <div
              key={cell.iso}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); reschedule(e.dataTransfer.getData('text/plain'), cell.iso); }}
              style={{ minHeight: 92, borderRadius: 8, padding: 6, background: cell.inMonth ? C.card : C.bg2,
                border: `1px solid ${isToday ? C.teal : C.border}`, opacity: cell.inMonth ? 1 : 0.5 }}
            >
              <div style={{ fontSize: 11, color: isToday ? C.teal : C.tx3, fontWeight: isToday ? 700 : 400, marginBottom: 4 }}>{cell.day}</div>
              {dayPosts.slice(0, 4).map(chip)}
              {dayPosts.length > 4 && <div style={{ fontSize: 10, color: C.tx3 }}>+{dayPosts.length - 4}</div>}
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div style={{ marginTop: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <h2 style={{ fontSize: 14, margin: '0 0 8px', color: C.tx }}>غير مجدول ({unscheduled.length}) — اسحبه إلى يوم</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unscheduled.map(chip)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
        {Object.keys(STATUS_LABEL).map((s) => (
          <span key={s} style={{ fontSize: 11.5, color: C.tx2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
