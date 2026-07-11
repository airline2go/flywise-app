'use client';

import { ADMIN_COLORS } from './theme';
import { labelStyle, inputStyle } from './EntityModal';

// Repeatable question/answer list — matches admin.js's addRouteFaqItem()/
// readRouteFaqItems() exactly (an optional admin override for a route
// page's FAQ section; empty means the page falls back to its
// auto-generated FAQ, see render-flight-route.jsx's custom_faq handling).
export default function RouteFaqEditor({ items, onChange }) {
  function updateItem(i, field, value) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function addItem() {
    onChange([...items, { question: '', answer: '' }]);
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 6 }}>أسئلة شائعة مخصّصة (اختياري)</div>
      {items.map((item, i) => (
        <div key={i} style={{ border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <input
            type="text" value={item.question} placeholder="السؤال"
            onChange={(e) => updateItem(i, 'question', e.target.value)}
            style={{ ...inputStyle, marginTop: 0, marginBottom: 6 }}
          />
          <textarea
            value={item.answer} placeholder="الجواب"
            onChange={(e) => updateItem(i, 'answer', e.target.value)}
            style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }}
          />
          <button type="button" onClick={() => removeItem(i)} style={removeBtnStyle}>حذف السؤال</button>
        </div>
      ))}
      <button type="button" onClick={addItem} style={addBtnStyle}>+ إضافة سؤال</button>
    </div>
  );
}

const removeBtnStyle = { marginTop: 6, background: 'none', border: 'none', color: ADMIN_COLORS.red, fontSize: 12.5, cursor: 'pointer', padding: 0 };
const addBtnStyle = {
  width: '100%', padding: '8px 0', borderRadius: 8, border: `1px dashed ${ADMIN_COLORS.border}`,
  background: 'transparent', color: ADMIN_COLORS.tx2, fontSize: 12.5, cursor: 'pointer',
};
