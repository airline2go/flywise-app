'use client';

// Ports admin.js's Error Logs page (loadErrorLogs/clearErrorLogs): level +
// source filters, expandable meta JSON per row, and a destructive
// clear-all action.
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const LEVEL_ICONS = { fatal: '🔴', error: '🟠', warn: '🟡' };

export default function ErrorLogsClient() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [source, setSource] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (source) params.set('source', source);
    const qs = params.toString();
    const res = await fetch(`/admin/api/error-logs${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (data.ok) setLogs(data.logs || []);
    setLoading(false);
  }, [level, source]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function clearLogs() {
    if (!confirm('تأكيد حذف كل سجل الأخطاء نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch('/admin/api/error-logs', { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل التنظيف');
  }

  function toggle(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>سجل الأخطاء</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>كل الأخطاء التقنية المسجّلة من السيرفر — Stripe، Duffel، البريد، والحجوزات</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={level} onChange={(e) => setLevel(e.target.value)} style={filterSelectStyle}>
            <option value="">كل المستويات</option>
            <option value="fatal">🔴 Fatal</option>
            <option value="error">🟠 Error</option>
            <option value="warn">🟡 Warn</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} style={filterSelectStyle}>
            <option value="">كل المصادر</option>
            <option value="stripe">Stripe</option>
            <option value="duffel">Duffel</option>
            <option value="email">Email</option>
            <option value="booking">Booking</option>
            <option value="server">Server</option>
          </select>
          <button type="button" onClick={clearLogs} style={ghostBtnStyle}>🗑 تنظيف السجل</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: ADMIN_COLORS.bg3 }}>
              <th style={thStyle}>المستوى</th>
              <th style={thStyle}>المصدر</th>
              <th style={thStyle}>الرسالة</th>
              <th style={thStyle}>الوقت</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={emptyCellStyle}>جارٍ التحميل...</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={5} style={emptyCellStyle}>لا توجد أخطاء مسجّلة 🎉</td></tr>}
            {!loading && logs.map((l) => {
              const metaStr = l.meta ? JSON.stringify(l.meta, null, 2) : '';
              return (
                <tr key={l.id} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                  <td style={tdStyle}>{LEVEL_ICONS[l.level] || '⚪'} {l.level}</td>
                  <td style={tdStyle}><span style={badgeStyle}>{l.source || 'server'}</span></td>
                  <td style={{ ...tdStyle, maxWidth: 360 }}>
                    {l.message}
                    {metaStr && (
                      <>
                        <br />
                        <button type="button" onClick={() => toggle(l.id)} style={linkBtnStyle}>عرض التفاصيل</button>
                        {expanded[l.id] && <pre style={metaPreStyle}>{metaStr}</pre>}
                      </>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('ar')}</td>
                  <td style={tdStyle} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const filterSelectStyle = {
  padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13,
};
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 11, padding: 0 };
const badgeStyle = { display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color: ADMIN_COLORS.yellow, background: ADMIN_COLORS.yellowBg };
const metaPreStyle = {
  display: 'block', fontSize: 11, background: ADMIN_COLORS.bg2, padding: 8, borderRadius: 6, marginTop: 6,
  overflowX: 'auto', maxWidth: 300, fontFamily: 'monospace', color: ADMIN_COLORS.tx2,
};
