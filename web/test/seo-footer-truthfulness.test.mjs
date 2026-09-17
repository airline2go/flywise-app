import test from 'node:test';
import assert from 'node:assert/strict';

const { htmlResponse } = await import('../lib/legacy-render/serve.js');

test('shared HTML response strips unsupported localized footer airline counts', async () => {
  const html = '<html lang="en"><body><main id="city-main"><p class="fdes">600+ airlines serve this city.</p><p>Real route information remains.</p></main></body></html>';
  const response = htmlResponse(html);
  const output = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(output, /600\+\s*airlines/i);
  assert.match(output, /Real route information remains\./);
});

test('shared HTML response removes unsupported city benefits and planning sections', async () => {
  const html = '<html lang="en"><body><main id="city-main"><section class="city-why">Book directly and get no hidden fees.</section><section class="city-tips">Planning tips in real time.</section><p>Useful city content.</p></main></body></html>';
  const response = htmlResponse(html);
  const output = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(output, /city-why|city-tips|in real time/i);
  assert.match(output, /Useful city content\./);
});
