import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('route handlers may keep compatibility import, but enhancer is a no-op', () => {
  const source = read('lib/legacy-render/route-html-enhance.js');
  assert.match(source, /return html/);
  assert.doesNotMatch(source, /getRoutePage|buildRouteSnapshot|formatPrice|priceLastCheckedTemplate/);
});

test('route renderer contains no live route-price request', () => {
  const source = read('lib/legacy-render/render-flight-route.js');
  assert.doesNotMatch(source, /fetch\(PROXY \+ '\/route-price/);
});
