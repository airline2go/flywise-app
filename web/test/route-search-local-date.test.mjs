import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../public/route-search-ui.js', import.meta.url), 'utf8');

test('route search derives the minimum date from local calendar fields', () => {
  assert.match(source, /function localDateString\(date\)/);
  assert.match(source, /today = localDateString\(new Date\(\)\)/);
  assert.doesNotMatch(source, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
});
