'use client';

// Ports admin.js's API Monitoring page (page-api): setApiMonitorPeriod/
// loadApiMonitorStats/renderApiMonitorStats + loadApiCostConfig/
// saveApiCostConfig + loadRouteScoreConfig/saveRouteScoreConfig. Owner-only
// (requireFullAdmin on every endpoint server-side), gated in page.js.
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function fmtDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d) {
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  return monday;
}
function fmtInt(n) {
  return Number(n || 0).toLocaleString('ar-EG');
}

export default function ApiMonitorClient() {
  const today = new Date();
  const [period, setPeriod] = useState('today');
  const [from, setFrom] = useState(fmtDateInput(today));
  const [to, setTo] = useState(fmtDateInput(today));
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [costConfig, setCostConfig] = useState({ costPerRequestEur: 0, dailyRequestAlertThreshold: 1000 });
  const [costSaving, setCostSaving] = useState(false);
  const [costBanner, setCostBanner] = useState(null);
  const [rsConfig, setRsConfig] = useState(null);
  const [rsSaving, setRsSaving] = useState(false);
  const [rsBanner, setRsBanner] = useState(null);

  const loadStats = useCallback(async (f, t) => {
    if (!f || !t) { setError('اختر تاريخ البداية والنهاية'); return; }
    setError('');
    const res = await fetch(`/admin/api/api-logs-stats?from=${f}&to=${t}`);
    const data = await res.json();
    if (data.ok) setStats(data);
    else setError(data.error || 'فشل تحميل البيانات');
  }, []);

  const loadConfigs = useCallback(async () => {
    const [costRes, rsRes] = await Promise.all([
      fetch('/admin/api/api-cost-config'),
      fetch('/admin/api/route-score-config'),
    ]);
    const [costData, rsData] = await Promise.all([costRes.json(), rsRes.json()]);
    if (costData.ok) setCostConfig(costData.config);
    if (rsData.ok) setRsConfig(rsData.config);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadConfigs();
      loadStats(fmtDateInput(today), fmtDateInput(today));
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConfigs]);

  function setQuickPeriod(which) {
    setPeriod(which);
    let f = from;
    let t = to;
    if (which === 'today') { f = fmtDateInput(today); t = fmtDateInput(today); }
    else if (which === 'week') { f = fmtDateInput(mondayOf(today)); t = fmtDateInput(today); }
    else if (which === 'month') { f = fmtDateInput(new Date(today.getFullYear(), today.getMonth(), 1)); t = fmtDateInput(today); }
    setFrom(f);
    setTo(t);
    loadStats(f, t);
  }

  async function saveCostConfig() {
    setCostSaving(true);
    const res = await fetch('/admin/api/api-cost-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(costConfig),
    });
    const data = await res.json();
    setCostSaving(false);
    if (data.ok) { setCostConfig(data.config); setCostBanner({ type: 'success', text: '✅ تم الحفظ' }); loadStats(from, to); }
    else setCostBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  async function saveRsConfig() {
    setRsSaving(true);
    const res = await fetch('/admin/api/route-score-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsConfig),
    });
    const data = await res.json();
    setRsSaving(false);
    if (data.ok) { setRsConfig(data.config); setRsBanner({ type: 'success', text: '✅ تم الحفظ — الأثر يظهر بعد دورة الحساب التالية (كل ساعة)' }); }
    else setRsBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  const errorRate = stats && stats.totalRequests > 0 ? ((stats.errorCount / stats.totalRequests) * 100).toFixed(1) : '0';
  const threshold = costConfig.dailyRequestAlertThreshold || 1000;
  const circuitTrouble = stats && stats.circuit.state !== 'closed';
  const overThreshold = stats && stats.totalRequests > threshold;
  const circuitLabel = !stats ? '' : stats.circuit.state === 'closed' ? '✅ يعمل بشكل طبيعي' : stats.circuit.state === 'half-open' ? '🟡 يُعاد المحاولة...' : '🔴 متوقف مؤقتاً';
  const circuitColor = !stats ? ADMIN_COLORS.tx3 : stats.circuit.state === 'closed' ? ADMIN_COLORS.teal : stats.circuit.state === 'half-open' ? '#f59e0b' : '#dc2626';
  const estimatedCost = stats && costConfig.costPerRequestEur > 0 ? `💰 تقدير تكلفة هذه الفترة: €${(stats.totalRequests * costConfig.costPerRequestEur).toFixed(2)}` : '';
  const maxRouteCount = stats && stats.topRoutes.length ? stats.topRoutes[0].count : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>مراقبة API</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>استهلاك Duffel API — عدد الطلبات، أكثر المسارات استهلاكاً، وتنبيهات عند الارتفاع</p>
        </div>
        <button type="button" onClick={() => loadStats(from, to)} style={ghostBtnStyle}>🔄 تحديث</button>
      </div>

      {(circuitTrouble || overThreshold) && (
        <div style={{ background: ADMIN_COLORS.bg2, border: '1.5px solid #f59e0b', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13, marginBottom: 6 }}>⚠️ تنبيه استهلاك API</div>
          {circuitTrouble && <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2 }}>اتصال Duffel متوقف مؤقتاً بسبب أخطاء متكررة — النظام بيعيد المحاولة تلقائياً.</div>}
          {overThreshold && <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2 }}>عدد الطلبات في هذه الفترة ({fmtInt(stats.totalRequests)}) تجاوز الحد المُعرَّف ({fmtInt(threshold)}).</div>}
        </div>
      )}

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>📅 الفترة</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['month', 'هذا الشهر']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setQuickPeriod(key)} style={period === key ? activeSmallBtnStyle : smallGhostBtnStyle}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={labelStyle}>
            من تاريخ
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriod('custom'); }} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            إلى تاريخ
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriod('custom'); }} style={inputStyle} />
          </label>
          <button type="button" onClick={() => loadStats(from, to)} style={primaryBtnStyle}>عرض</button>
        </div>
        {error && <div style={{ padding: '0 20px 14px', color: ADMIN_COLORS.red, fontSize: 12.5 }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        <StatCard label="إجمالي الطلبات" value={stats ? fmtInt(stats.totalRequests) : '0'} sub={stats ? `${fmtInt(stats.byCategory.other)} طلب آخر` : '—'} color={ADMIN_COLORS.blue} />
        <StatCard label="طلبات بحث الأسعار" value={stats ? fmtInt(stats.byCategory.search) : '0'} color={ADMIN_COLORS.teal} />
        <StatCard label="طلبات الحجوزات" value={stats ? fmtInt(stats.byCategory.booking) : '0'} color={ADMIN_COLORS.yellow} />
        <StatCard label="طلبات فاشلة" value={stats ? fmtInt(stats.errorCount) : '0'} sub={stats ? `نسبة الفشل ${errorRate}%` : '—'} color={ADMIN_COLORS.red} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>🌍 أكثر المسارات استهلاكاً</div>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats && stats.topRoutes.length === 0 && <div style={{ color: ADMIN_COLORS.tx3, fontSize: 13, padding: '8px 0' }}>لا توجد بيانات لهذه الفترة</div>}
            {stats && stats.topRoutes.map((r, idx) => {
              const pct = maxRouteCount > 0 ? (r.count / maxRouteCount) * 100 : 0;
              return (
                <div key={`${r.origin}-${r.destination}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={rankNumStyle}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✈️ {r.origin} → {r.destination}</span>
                      <span style={{ fontSize: 12, color: ADMIN_COLORS.tx2, whiteSpace: 'nowrap' }}>{fmtInt(r.count)} طلب</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: ADMIN_COLORS.bg3, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: ADMIN_COLORS.teal }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>⚡ حالة الاتصال بـ Duffel</div>
          <div style={{ padding: 20 }}>
            {!stats ? (
              <div style={{ color: ADMIN_COLORS.tx3, fontSize: 13 }}>جارٍ التحميل...</div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: circuitColor, marginBottom: 6 }}>{circuitLabel}</div>
                <div style={{ fontSize: 12, color: ADMIN_COLORS.tx3 }}>فشل متتالي: {stats.circuit.consecutiveFailures}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>⚙️ إعدادات التكلفة والتنبيه</div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: ADMIN_COLORS.tx3, margin: 0, lineHeight: 1.6 }}>
            Duffel عادة ما لا يفرض رسوم على طلبات البحث نفسها — التكلفة الحقيقية هي رسوم الحجز المحسوبة أصلاً في الأرباح. القيمة هنا تقدير اختياري بس، لو عندك خطة مدفوعة فعلياً حسب عدد الطلبات.
          </p>
          {costBanner && (
            <div style={{ ...bannerStyle(costBanner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{costBanner.text}</span>
              <button type="button" onClick={() => setCostBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={labelStyle}>
              تكلفة تقديرية لكل طلب (€، اختياري)
              <input type="number" min={0} step={0.001} value={costConfig.costPerRequestEur} onChange={(e) => setCostConfig((c) => ({ ...c, costPerRequestEur: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              تنبيه عند تجاوز عدد الطلبات (يومياً)
              <input type="number" min={1} step={1} value={costConfig.dailyRequestAlertThreshold} onChange={(e) => setCostConfig((c) => ({ ...c, dailyRequestAlertThreshold: parseInt(e.target.value, 10) || 1000 }))} style={inputStyle} />
            </label>
            <button type="button" disabled={costSaving} onClick={saveCostConfig} style={primaryBtnStyle}>💾 حفظ</button>
          </div>
          {estimatedCost && <div style={{ fontSize: 13, color: ADMIN_COLORS.tx2 }}>{estimatedCost}</div>}
        </div>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>📊 أوزان Route Score</div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: ADMIN_COLORS.tx3, margin: 0, lineHeight: 1.6 }}>
            Route Score رقم يعتمد على زيارات/كليكات/بدايات حجز حقيقية لكل مسار — للعرض فقط حالياً، مفيش أي أتمتة مرتبطة فيه. القيم الافتراضية تخمينات أولية، عدّلها بعد ما تشوف بيانات حقيقية كافية.
          </p>
          {rsBanner && (
            <div style={{ ...bannerStyle(rsBanner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{rsBanner.text}</span>
              <button type="button" onClick={() => setRsBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          {rsConfig && (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <RsField label="نصف عمر الأهمية (أيام)" value={rsConfig.halfLifeDays} step={0.5} min={0.1} onChange={(v) => setRsConfig((c) => ({ ...c, halfLifeDays: v }))} />
                <RsField label="نافذة البيانات (أيام)" value={rsConfig.lookbackDays} step={1} min={1} onChange={(v) => setRsConfig((c) => ({ ...c, lookbackDays: v }))} />
                <RsField label="وزن الزيارة (impression)" value={rsConfig.impressionWeight} step={0.1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, impressionWeight: v }))} />
                <RsField label="وزن الكليك (click)" value={rsConfig.clickWeight} step={0.1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, clickWeight: v }))} />
                <RsField label="وزن بداية الحجز (booking_start)" value={rsConfig.bookingWeight} step={0.1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, bookingWeight: v }))} />
                <RsField label="وزن نسبة الكليك (CTR)" value={rsConfig.ctrWeight} step={0.1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, ctrWeight: v }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <RsField label="حد الثقة المنخفضة (أقل من)" value={rsConfig.confidenceLowMax} step={1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, confidenceLowMax: v }))} />
                <RsField label="حد الثقة العالية (أكبر أو يساوي)" value={rsConfig.confidenceHighMin} step={1} min={0} onChange={(v) => setRsConfig((c) => ({ ...c, confidenceHighMin: v }))} />
                <button type="button" disabled={rsSaving} onClick={saveRsConfig} style={primaryBtnStyle}>💾 حفظ</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RsField({ label, value, step, min, onChange }) {
  return (
    <label style={labelStyle}>
      {label}
      <input type="number" min={min} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} style={inputStyle} />
    </label>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: color || ADMIN_COLORS.tx }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function bannerStyle(type) {
  const color = type === 'error' ? ADMIN_COLORS.red : ADMIN_COLORS.teal;
  const bg = type === 'error' ? ADMIN_COLORS.redBg : ADMIN_COLORS.tealGlow;
  return { color, background: bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13 };
}

const rankNumStyle = {
  width: 22, height: 22, borderRadius: '50%', background: ADMIN_COLORS.bg3, color: ADMIN_COLORS.tx2,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
};
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: ADMIN_COLORS.tx2 };
const inputStyle = { padding: '9px 11px', background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14, width: 150 };
const primaryBtnStyle = { padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal, color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' };
const ghostBtnStyle = { padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent', color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer' };
const smallGhostBtnStyle = { padding: '6px 12px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent', color: ADMIN_COLORS.tx, fontSize: 12, cursor: 'pointer' };
const activeSmallBtnStyle = { ...smallGhostBtnStyle, background: ADMIN_COLORS.tealGlow, borderColor: ADMIN_COLORS.teal, color: ADMIN_COLORS.teal };
