'use client';

import { ADMIN_COLORS } from './theme';

// Generic paginated data table — built from the route-pages tab's real
// needs (the biggest/most complex CRUD tab, per the migration plan's
// "proof-of-pattern" milestone), not speculatively. Covers the dominant
// admin.js pattern: fetch list -> render rows -> edit/delete per row ->
// re-fetch. `columns[].render(row)` lets a caller format/compose a cell;
// plain `columns[].key` falls back to `row[key]`.
// `selection` (optional) adds a leading checkbox column — { selectedIds:
// {id:true}, onToggle(id), onToggleAll(checked) } — used by route-pages'
// bulk refresh-frequency apply, matching admin.js's per-row + select-all
// checkboxes.
export default function CrudTable({ columns, rows, keyField = 'id', onEdit, onDelete, loading, emptyLabel = 'لا توجد بيانات', selection }) {
  const colSpan = columns.length + 1 + (selection ? 1 : 0);
  const allSelected = !!selection && rows.length > 0 && rows.every((r) => selection.selectedIds[r[keyField]]);
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: ADMIN_COLORS.bg3 }}>
            {selection && (
              <th style={thStyle}><input type="checkbox" checked={allSelected} onChange={(e) => selection.onToggleAll(e.target.checked)} /></th>
            )}
            {columns.map((c) => (
              <th key={c.key} style={thStyle}>{c.label}</th>
            ))}
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={colSpan} style={emptyCellStyle}>...جارٍ التحميل</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={colSpan} style={emptyCellStyle}>{emptyLabel}</td></tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row[keyField]} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
              {selection && (
                <td style={tdStyle}>
                  <input type="checkbox" checked={!!selection.selectedIds[row[keyField]]} onChange={() => selection.onToggle(row[keyField])} />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} style={tdStyle}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                {onEdit && <button type="button" onClick={() => onEdit(row)} style={linkBtnStyle}>تعديل</button>}
                {onDelete && <button type="button" onClick={() => onDelete(row)} style={{ ...linkBtnStyle, color: ADMIN_COLORS.red, marginInlineStart: 10 }}>حذف</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPageChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: ADMIN_COLORS.tx2 }}>
      <span>{total} إجمالي — صفحة {page} من {totalPages}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={pageBtnStyle(page <= 1)}>السابق</button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={pageBtnStyle(page >= totalPages)}>التالي</button>
      </div>
    </div>
  );
}

const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 13, padding: 0 };
function pageBtnStyle(disabled) {
  return {
    background: 'transparent', border: `1px solid ${ADMIN_COLORS.border}`, color: disabled ? ADMIN_COLORS.tx3 : ADMIN_COLORS.tx2,
    borderRadius: 6, padding: '5px 12px', fontSize: 12.5, cursor: disabled ? 'default' : 'pointer',
  };
}
