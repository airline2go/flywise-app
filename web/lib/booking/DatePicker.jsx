'use client';

// Ports app.js's custom calendar overlay (#cal-ov/buildCalGrid()/
// calClickDay()/confirmCal()) as one reusable popover: 'range' mode for
// the main depart+return picker (classic two-tap range selection —
// first tap sets depart, second sets return; tapping an earlier date
// while picking return swaps them), 'single' mode for one-way and for
// each multi-city leg (where minDate enforces leg N's date >= leg
// N-1's, same constraint mcOpenCal() applied).
import { useState } from 'react';

function fmtDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateInput(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DatePicker({ mode, value, minDate, maxDate, onChange, onClose, doneLabel }) {
  const seed = mode === 'single' ? parseDateInput(value) : parseDateInput(value?.depart) || new Date();
  const [viewYear, setViewYear] = useState(seed ? seed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(seed ? seed.getMonth() : new Date().getMonth());

  const today = startOfToday();
  const min = minDate ? parseDateInput(minDate) : today;
  const max = maxDate ? parseDateInput(maxDate) : null;
  const depart = mode === 'range' ? parseDateInput(value?.depart) : null;
  const ret = mode === 'range' ? parseDateInput(value?.return) : null;
  const single = mode === 'single' ? parseDateInput(value) : null;

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function isDisabled(d) {
    if (d < min) return true;
    if (max && d > max) return true;
    return false;
  }

  function clickDay(d) {
    if (isDisabled(d)) return;
    if (mode === 'single') {
      onChange(fmtDateInput(d));
      onClose();
      return;
    }
    // range mode
    if (!depart || (depart && ret)) {
      onChange({ depart: fmtDateInput(d), return: null });
      return;
    }
    if (d < depart) {
      onChange({ depart: fmtDateInput(d), return: fmtDateInput(depart) });
      return;
    }
    onChange({ depart: fmtDateInput(depart), return: fmtDateInput(d) });
    onClose();
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(viewYear, viewMonth, day));

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={headerStyle}>
          <button type="button" onClick={() => changeMonth(-1)} style={navBtnStyle} aria-label="prev">‹</button>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{monthLabel}</div>
          <button type="button" onClick={() => changeMonth(1)} style={navBtnStyle} aria-label="next">›</button>
        </div>
        <div style={weekRowStyle}>
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => <span key={d} style={weekLabelStyle}>{d}</span>)}
        </div>
        <div style={gridStyle}>
          {cells.map((d, idx) => {
            if (!d) return <span key={idx} />;
            const disabled = isDisabled(d);
            const isDep = mode === 'range' && depart && d.getTime() === depart.getTime();
            const isRet = mode === 'range' && ret && d.getTime() === ret.getTime();
            const inRange = mode === 'range' && depart && ret && d > depart && d < ret;
            const isSingle = mode === 'single' && single && d.getTime() === single.getTime();
            const isToday = d.getTime() === today.getTime();
            return (
              <button
                key={idx} type="button" disabled={disabled} onClick={() => clickDay(d)}
                style={dayStyle({ disabled, selected: isDep || isRet || isSingle, inRange, isToday })}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        {mode === 'range' && (
          <button type="button" onClick={onClose} disabled={!depart} style={doneBtnStyle}>{doneLabel}</button>
        )}
      </div>
    </div>
  );
}

function dayStyle({ disabled, selected, inRange, isToday }) {
  return {
    width: 36, height: 36, borderRadius: '50%', border: isToday ? '1px solid var(--teal)' : 'none',
    background: selected ? 'var(--teal)' : inRange ? 'var(--teal-lt)' : 'transparent',
    color: disabled ? 'var(--tx3)' : selected ? '#fff' : 'var(--tx)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: selected ? 700 : 400,
  };
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 16px', overflowY: 'auto', zIndex: 60,
};
const panelStyle = {
  width: '100%', maxWidth: 340, background: 'var(--bg)', border: '1px solid var(--bd)',
  borderRadius: 'var(--r)', padding: 16, boxShadow: '0 12px 32px rgba(0,0,0,.2)',
};
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 };
const navBtnStyle = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--tx2)', padding: '0 8px' };
const weekRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 };
const weekLabelStyle = { textAlign: 'center', fontSize: 11, color: 'var(--tx3)', fontWeight: 700 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, justifyItems: 'center' };
const doneBtnStyle = {
  width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 'var(--r-sm)', border: 'none',
  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  opacity: 1,
};
