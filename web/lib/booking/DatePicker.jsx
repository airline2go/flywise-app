'use client';

// Ports the real #cal-ov/.cal-box bottom-sheet calendar exactly
// (buildCalGrid()/calClickDay()/confirmCal()) — same classes so
// styles.css applies identically. 'range' mode is the main depart+return
// picker (classic two-tap range selection); 'single' mode (no return
// selector shown) is reused for one-way and each multi-city leg, same
// as the original reusing one #cal-ov for both.
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
function fmtSelVal(d) {
  return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : 'Datum wählen';
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function DatePicker({ mode, value, minDate, maxDate, onChange, onClose }) {
  const seed = mode === 'single' ? parseDateInput(value) : parseDateInput(value?.depart) || new Date();
  const [viewYear, setViewYear] = useState(seed ? seed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(seed ? seed.getMonth() : new Date().getMonth());
  const [calMode, setCalMode] = useState('dep');

  const today = startOfToday();
  const min = minDate ? parseDateInput(minDate) : today;
  const max = maxDate ? parseDateInput(maxDate) : null;
  const depart = mode === 'range' ? parseDateInput(value?.depart) : parseDateInput(value);
  const ret = mode === 'range' ? parseDateInput(value?.return) : null;

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  }

  function isDisabled(d) {
    if (d < min) return true;
    if (max && d > max) return true;
    return false;
  }

  function clickDay(d) {
    if (isDisabled(d)) return;
    if (mode === 'single') { onChange(fmtDateInput(d)); onClose(); return; }
    if (calMode === 'dep') {
      onChange({ depart: fmtDateInput(d), return: ret ? fmtDateInput(ret) : null });
      if (ret && d < ret) { onClose(); return; }
      setCalMode('ret');
      return;
    }
    if (depart && d < depart) {
      onChange({ depart: fmtDateInput(d), return: fmtDateInput(depart) });
      onClose();
      return;
    }
    onChange({ depart: depart ? fmtDateInput(depart) : fmtDateInput(d), return: fmtDateInput(d) });
    onClose();
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const totalCells = 7 * Math.ceil((offset + daysInMonth) / 7);
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    let day, month = viewMonth, year = viewYear, otherMonth = false;
    if (i < offset) { day = prevMonthDays - (offset - 1 - i); month = viewMonth - 1; if (month < 0) { month = 11; year--; } otherMonth = true; }
    else if (i >= offset + daysInMonth) { day = i - offset - daysInMonth + 1; month = viewMonth + 1; if (month > 11) { month = 0; year++; } otherMonth = true; }
    else { day = i - offset + 1; }
    cells.push({ date: new Date(year, month, day), otherMonth });
  }

  const monthLabel = firstOfMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="ov open" role="dialog" aria-modal="true" aria-label="Datum auswählen" style={{ alignItems: 'flex-end', padding: 0 }} onClick={onClose}>
      <div className="cal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cal-hd">
          <div className="cal-sel-row">
            <div className={`cal-sel-btn${calMode === 'dep' ? ' active' : ''}`} onClick={() => setCalMode('dep')}>
              <div className="cal-sel-lbl">Hinreise</div>
              <div className="cal-sel-val">{fmtSelVal(depart)}</div>
            </div>
            {mode === 'range' && (
              <div className={`cal-sel-btn${calMode === 'ret' ? ' active' : ''}`} onClick={() => setCalMode('ret')}>
                <div className="cal-sel-lbl">Rückreise</div>
                <div className="cal-sel-val">{fmtSelVal(ret)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
          <span className="cal-month-lbl">{monthLabel}</span>
          <button type="button" className="cal-nav-btn" onClick={() => changeMonth(1)}>›</button>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>

        <div className="cal-grid">
          {cells.map(({ date: real, otherMonth }, idx) => {
            const disabled = isDisabled(real);
            const isToday = real.getTime() === today.getTime();
            const isDep = depart && real.getTime() === depart.getTime();
            const isRet = ret && real.getTime() === ret.getTime();
            const inRange = depart && ret && real > depart && real < ret;
            let cls = 'cal-day';
            if (otherMonth) cls += ' other-month';
            if (disabled) cls += ' past';
            if (isToday) cls += ' today';
            if (isDep) cls += ' dep-sel';
            if (isRet) cls += ' ret-sel';
            if (inRange) cls += ' in-range';
            if (isDep && ret) cls += ' range-start';
            if (isRet && depart) cls += ' range-end';
            return (
              <button key={idx} type="button" className={cls} disabled={disabled} onClick={() => clickDay(real)}>
                {real.getDate()}
              </button>
            );
          })}
        </div>

        <div className="cal-foot">
          <button type="button" className="cal-cancel" onClick={onClose}>Abbrechen</button>
          <button type="button" className="cal-confirm" onClick={onClose}>Daten festlegen</button>
        </div>
      </div>
    </div>
  );
}
