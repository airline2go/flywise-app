// Tests the pure calendar helpers behind the Content Studio calendar view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { monthGrid, bucketByDate, isoDate } = require('../lib/social/calendar.js');

test('monthGrid returns a full 6×7 grid with correct in-month days', () => {
  const weeks = monthGrid(2026, 7); // August 2026
  assert.equal(weeks.length, 6);
  assert.ok(weeks.every((w) => w.length === 7));
  const inMonth = weeks.flat().filter((c) => c.inMonth);
  assert.equal(inMonth.length, 31); // August has 31 days
  assert.equal(inMonth[0].iso, '2026-08-01');
  assert.equal(inMonth[30].iso, '2026-08-31');
});

test('monthGrid weeks start on Monday and spill into neighbouring months', () => {
  const weeks = monthGrid(2026, 7); // Aug 1 2026 is a Saturday
  const firstWeek = weeks[0];
  // Saturday is the 6th Monday-started slot (Mon..Sat), so Aug 1 sits at index 5.
  assert.equal(firstWeek[5].iso, '2026-08-01');
  assert.equal(firstWeek[5].inMonth, true);
  assert.equal(firstWeek[0].inMonth, false); // leading July days
  assert.equal(firstWeek[0].iso, '2026-07-27'); // Monday before
});

test('monthGrid handles year boundaries (December)', () => {
  const weeks = monthGrid(2026, 11); // December 2026
  const inMonth = weeks.flat().filter((c) => c.inMonth);
  assert.equal(inMonth.length, 31);
  assert.equal(inMonth[30].iso, '2026-12-31');
  // trailing cells roll into January 2027
  assert.ok(weeks.flat().some((c) => c.iso.startsWith('2027-01')));
});

test('bucketByDate groups posts by scheduled day and collects the unscheduled', () => {
  const posts = [
    { id: 'a', scheduled_at: '2026-08-10T09:00:00Z' },
    { id: 'b', scheduled_at: '2026-08-10T18:30:00Z' },
    { id: 'c', scheduled_at: '2026-08-12T12:00:00Z' },
    { id: 'd', scheduled_at: null },
    { id: 'e' },
    { id: 'f', scheduled_at: 'not-a-date' },
  ];
  const { map, unscheduled } = bucketByDate(posts);
  const d10 = new Date('2026-08-10T09:00:00Z');
  const key10 = isoDate(d10.getFullYear(), d10.getMonth(), d10.getDate());
  assert.equal(map[key10].length, 2);
  assert.equal(unscheduled.length, 3); // d, e, f
});
