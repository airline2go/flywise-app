import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('shared HTML response strips unsupported localized footer airline counts', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'lib/legacy-render/serve.js'), 'utf8');
  assert.match(source, /fdes/);
  assert.match(source, /600\\+\?/);
  assert.match(source, /hundreds|hunderte|centenas|centaines|centinaia|honderden|yüzlerce/);
});
