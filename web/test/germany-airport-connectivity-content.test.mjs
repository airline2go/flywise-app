import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rendererPath = path.join(process.cwd(), 'lib/legacy-render/render-germany-airport-connectivity.mjs');
const source = fs.readFileSync(rendererPath, 'utf8');

test('Germany connectivity research exposes citation-ready analytical highlights', () => {
  assert.match(source, /Analytical highlights/);
  assert.match(source, /internationalShare/);
  assert.match(source, /widestAirport/);
  assert.match(source, /leadingCorridor/);
  assert.match(source, /updated_at/);
  assert.match(source, /dateModified: snapshotDate/);
});

test('Germany connectivity research keeps catalogue-signal limitations explicit', () => {
  assert.match(source, /not a claim about demand, flight frequency, market share/);
  assert.match(source, /Missing country or IATA values are not inferred/);
});
