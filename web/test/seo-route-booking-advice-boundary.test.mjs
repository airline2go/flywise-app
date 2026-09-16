import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlResponse } from '../lib/legacy-render/serve.js';

async function bodyOf(html) {
  const response = htmlResponse(html);
  return response.text();
}

test('removes unsupported route best-time and booking-window FAQ blocks', async () => {
  const html = `
    <main id="route-main">
      <section class="route-besttime-section"><h2>Best time to fly</h2><p>Book 6 weeks ahead.</p></section>
      <section class="route-faq">
        <div class="route-faq-item"><h3>What is the best time to fly this route?</h3><p>Spring is best.</p></div>
        <div class="route-faq-item"><h3>How long is the fastest flight?</h3><p>9h 30m.</p></div>
      </section>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the best time to fly this route?', acceptedAnswer: { '@type': 'Answer', text: 'Spring is best.' } },
          { '@type': 'Question', name: 'How long is the fastest flight?', acceptedAnswer: { '@type': 'Answer', text: '9h 30m.' } }
        ]
      })}</script>
    </main>`;

  const output = await bodyOf(html);
  assert.doesNotMatch(output, /Best time to fly|Book 6 weeks ahead|Spring is best/i);
  assert.match(output, /How long is the fastest flight\?/i);
  assert.match(output, /9h 30m/i);
  assert.match(output, /FAQPage/i);
});

test('preserves evidence-backed route facts and unrelated JSON-LD', async () => {
  const html = `
    <main id="route-main"><h1>Flights from Dubai to Brussels</h1><p>Fastest flight: 9h 30m.</p>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Flight',
        flightNumber: 'AP123',
        name: 'Dubai to Brussels'
      })}</script>
    </main>`;
  const output = await bodyOf(html);
  assert.match(output, /Fastest flight: 9h 30m/i);
  assert.match(output, /"@type":"Flight"/i);
});
