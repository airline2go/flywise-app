'use strict';

// [CONTENT-CALENDAR] Pure date helpers for the Social Studio calendar view —
// no React, so the month-grid and bucketing logic is unit-testable in isolation.

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

// A 6-week (42-cell) month grid, weeks starting Monday. `month` is 0-indexed.
// Each cell: { iso: 'YYYY-MM-DD', day, inMonth }. Leading/trailing cells spill
// into the neighbouring months (inMonth=false) so the grid is always full.
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const firstDow = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstDow + 1;
    let y = year, m = month, d = dayNum, inMonth = true;
    if (dayNum < 1) { inMonth = false; m = month - 1; d = prevDays + dayNum; if (m < 0) { m = 11; y = year - 1; } }
    else if (dayNum > daysInMonth) { inMonth = false; m = month + 1; d = dayNum - daysInMonth; if (m > 11) { m = 0; y = year + 1; } }
    cells.push({ iso: isoDate(y, m, d), day: d, inMonth });
  }
  const weeks = [];
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  return weeks;
}

// Group posts by their scheduled local date; posts without a (valid) date go to
// `unscheduled`. Returns { map: { 'YYYY-MM-DD': [post,…] }, unscheduled: [post] }.
function bucketByDate(posts) {
  const map = {};
  const unscheduled = [];
  for (const p of posts || []) {
    if (!p || !p.scheduled_at) { if (p) unscheduled.push(p); continue; }
    const d = new Date(p.scheduled_at);
    if (Number.isNaN(d.getTime())) { unscheduled.push(p); continue; }
    const iso = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    (map[iso] = map[iso] || []).push(p);
  }
  return { map, unscheduled };
}

module.exports = { monthGrid, bucketByDate, isoDate };
