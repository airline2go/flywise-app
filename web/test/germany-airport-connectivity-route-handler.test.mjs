import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const routePath = path.join(process.cwd(), 'app/[lang]/research/germany-airport-connectivity/route.js');
const source = fs.readFileSync(routePath, 'utf8');

test('English Germany connectivity route awaits dynamic params', () => {
  assert.match(source, /const \{ lang \} = await params;/);
  assert.doesNotMatch(source, /params\?\.lang/);
  assert.match(source, /export const dynamic = 'force-dynamic';/);
  assert.match(source, /export const dynamicParams = true;/);
});
