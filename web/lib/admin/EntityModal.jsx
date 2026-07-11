'use client';

import { ADMIN_COLORS } from './theme';

// Generic create/edit modal — the second half of the CrudTable pair.
// `fields` drives a plain text/textarea/select/number/checkbox form;
// anything more bespoke (e.g. route-pages' airport autocomplete + FAQ
// list) is passed as `extra`, rendered between the generic fields and
// the submit row, since forcing every oddball input through one field
// schema isn't worth the abstraction (see the migration plan's
// reasoning for why this stays small and in-house rather than adopting
// a full form library).
export default function EntityModal({ title, fields = [], values, onChange, onSubmit, onClose, submitting, error, extra, footer }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (onSubmit) onSubmit();
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} style={modalStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{title}</h2>

        {fields.map((f) => (
          <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => onChange(f.name, v)} />
        ))}

        {extra}

        {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginTop: 10 }}>{error}</div>}

        {/* [ROUTE-EDITOR-TWO-BUTTON-SAVE] Most entity types just need one
            "حفظ"/save action, but route-pages has two distinct save
            actions (draft vs. publish), matching admin.js's editor
            exactly — `footer` lets a caller replace the default single
            button without forking the whole modal. */}
        {footer || (
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" disabled={submitting} style={saveBtnStyle}>{submitting ? '...' : 'حفظ'}</button>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>إلغاء</button>
          </div>
        )}
      </form>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <label style={labelStyle}>
        {field.label}
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label style={labelStyle}>
        {field.label}
        <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
      </label>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <label style={labelStyle}>
      {field.label}
      <input
        type={field.type || 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(field.type === 'number' ? e.target.valueAsNumber : e.target.value)}
        readOnly={field.readOnly}
        style={{ ...inputStyle, ...(field.readOnly ? { color: ADMIN_COLORS.tx2 } : {}) }}
      />
    </label>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 50,
};
const modalStyle = {
  width: '100%', maxWidth: 520, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const saveBtnStyle = {
  padding: '9px 22px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
};
const cancelBtnStyle = {
  padding: '9px 22px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx2, fontSize: 13.5, cursor: 'pointer',
};

export { FieldInput, labelStyle, inputStyle };
