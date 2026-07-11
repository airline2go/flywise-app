'use client';

// Ports admin.js's renderTopList(): groups bookings by fieldFn(b), counts +
// sums revenue, sorts desc by count, takes top 6, renders numbered rank rows
// with a bar proportional to the top entry's count.
import { ADMIN_COLORS } from './theme';

export default function RankedList({ bookings, fieldFn, icon, emptyLabel }) {
  const counts = {};
  bookings.forEach((b) => {
    const name = fieldFn(b) || 'غير محدد';
    if (!counts[name]) counts[name] = { count: 0, revenue: 0 };
    counts[name].count += 1;
    counts[name].revenue += Number(b.customer_paid) || Number(b.total_amount) || 0;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 6);

  if (!entries.length) {
    return <div style={{ color: ADMIN_COLORS.tx3, fontSize: 13, padding: '8px 0' }}>{emptyLabel || 'لا توجد بيانات لهذه الفترة'}</div>;
  }

  const maxCount = entries[0][1].count;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {entries.map(([name, data], idx) => {
        const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
        return (
          <div key={name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: ADMIN_COLORS.bg3, color: ADMIN_COLORS.tx2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{idx + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{icon} {name}</span>
                <span style={{ fontSize: 12, color: ADMIN_COLORS.tx2, whiteSpace: 'nowrap' }}>{data.count} حجز</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: ADMIN_COLORS.bg3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: ADMIN_COLORS.teal }} />
              </div>
              <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 4 }}>إيرادات €{data.revenue.toFixed(2)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
