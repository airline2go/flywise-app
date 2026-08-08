import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminSession } from '../../../../../lib/admin/adminFetch';
import suggestMod from '../../../../../lib/seo/suggest.js';

// [Phase 15 + 16] Generate a BEFORE / PROPOSED SEO optimization suggestion for a
// single route, using Claude as the PRIMARY generator and the rule-based
// `suggest.js` as the FALLBACK (no API key, a refusal, or any error).
//
// This is READ-ONLY: it proposes a Title / Meta / H1 for the operator to review;
// it writes nothing to the page or the DB. The same hard guardrails apply to the
// AI path as to the rules path — the system prompt below forbids inventing any
// price, airline, flight time, distance, query, or metric, forbids rewriting the
// global template/architecture, requires the page's own language + dominant
// intent, keeps the "| Airpiv" brand, and returns "no change recommended" unless
// a real trigger (missing element, oversized title, or a genuine CTR
// opportunity + intent mismatch) exists.
const { buildOptimizationSuggestions } = suggestMod;

export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5';
const SUPPORTED_LANGS = new Set(['de', 'en']);

// The shape both the AI and the rule engine return, so the client renders one UI.
const SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cities', 'opportunity', 'dominantIntent', 'title', 'meta', 'h1'],
  properties: {
    cities: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['origin', 'destination'],
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
      },
    },
    opportunity: { type: 'boolean' },
    dominantIntent: { type: 'string' },
    title: elementSchema(),
    meta: elementSchema(),
    h1: elementSchema(),
    content: {
      type: 'object',
      additionalProperties: false,
      required: ['current', 'proposed', 'changeRecommended', 'reason', 'factsUsed'],
      properties: {
        current: { type: 'null' },
        proposed: { type: ['string', 'null'] },
        changeRecommended: { type: 'boolean' },
        reason: { type: 'string' },
        factsUsed: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

function elementSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['current', 'proposed', 'changeRecommended', 'reason'],
    properties: {
      current: { type: ['string', 'null'] },
      proposed: { type: ['string', 'null'] },
      changeRecommended: { type: 'boolean' },
      reason: { type: 'string' },
    },
  };
}

const SYSTEM_PROMPT = [
  'You are an SEO editor for Airpiv, a flight-route information site. You produce a',
  'BEFORE / PROPOSED comparison for ONE route page: an optional new <title>, meta',
  'description, and H1. You are advisory only — a human reviews and applies every',
  'suggestion. Follow these rules exactly; they are hard constraints, not preferences.',
  '',
  'FACTUAL GROUNDING (never fabricate):',
  '- Use ONLY the city names you can read in the provided H1/title. Never invent or',
  '  guess a city, airport, or country. If you cannot extract a clean origin+',
  '  destination pair, set cities to null and set changeRecommended=false with a',
  '  short reason asking for manual review.',
  '- NEVER invent a price, fare, airline, flight duration, distance, departure time,',
  '  search query, click, impression, position, or any other metric. You may mention',
  '  a FACET word (e.g. "Direktflüge"/"Direct Flights", "Preise"/"Prices",',
  '  "Entfernung"/"Distance", "Flugzeit"/"Flight Time") ONLY when the page content',
  '  flags say the page actually exposes that information.',
  '',
  'LANGUAGE & INTENT:',
  '- Write proposals in the page language: "de" → German, "en" → English. For any',
  '  other language, propose nothing (changeRecommended=false) and ask for manual',
  '  review — do not translate or guess.',
  '- Lead the title/meta with the DOMINANT search intent when one is given and the',
  '  page supports it. Do not stuff more than ~2 facets; avoid keyword spam.',
  '',
  'WHEN TO PROPOSE (otherwise return current + changeRecommended=false):',
  '- TITLE: propose only if the current title is missing, is longer than ~65',
  '  characters (risking truncation), OR there is a real CTR opportunity AND the',
  '  current title does not lead with the dominant intent. Keep the brand suffix',
  '  "| Airpiv". Aim for <= 60 characters before the brand.',
  '- META: propose only if the current meta is missing, OR there is a real CTR',
  '  opportunity and a question-style meta answering the dominant intent would help.',
  '- H1: propose only if the current H1 is missing or clearly weak. A clear',
  '  route H1 ("Flüge von X nach Y" / "Flights from X to Y") is fine — do not churn it.',
  '- A "real CTR opportunity" means: impressions are meaningful and the average',
  '  position is competitive while clicks/CTR are low. If no GSC data is provided,',
  '  there is no CTR opportunity — only propose for missing/oversized elements.',
  '',
  'CONTENT (unique, ranking-strong body copy — always produce this):',
  '- Write a UNIQUE intro paragraph for THIS route plus 2-3 FAQ question/answer',
  '  pairs, in the page language, that read naturally and would help a searcher.',
  '- Ground every sentence ONLY in: the real city names, the dominant intent, the',
  '  page content flags, and the `verifiedFacts` object (distance, flightTime,',
  '  airlines). You MUST NOT state any number, duration, distance, price, or airline',
  '  that is not present in `verifiedFacts`. If a fact is missing, write about it',
  '  qualitatively ("see the route section above") — never invent a value.',
  '- Because the city names and facts differ per route, the content must be unique',
  '  per page — never a boilerplate paragraph with the names swapped in.',
  '- Put the whole thing in content.proposed as plain text: the intro paragraph,',
  '  then each FAQ as two lines "Q: ..." then "A: ...", separated by a blank line.',
  '  Set content.current to null, content.changeRecommended to true, and list the',
  '  verifiedFacts you actually used in content.factsUsed (e.g. "distance: 1.100 km").',
  '  If cities are unparseable, set content.proposed=null and changeRecommended=false.',
  '',
  'SCOPE: propose only title/meta/H1 and this content block. Never propose changing',
  'the site architecture, URL, canonical, hreflang, schema, or global templates.',
  '',
  'Return your answer ONLY as JSON matching the provided schema. `reason` fields may',
  'be written in Arabic (the operator reads Arabic); everything shown to end users',
  '(title/meta/h1 proposed) MUST be in the page language.',
].join('\n');

// Build the compact, factual context the model is allowed to use. We forward only
// the already-extracted, real page signals — nothing is fetched or invented here.
function buildUserContent({ elements, gsc, dominantIntent, lang }) {
  const c = (elements && elements.content) || {};
  const ctr = gsc && gsc.impressions && gsc.clicks != null ? gsc.clicks / gsc.impressions : null;
  return JSON.stringify({
    lang,
    dominantIntent: dominantIntent || 'flight',
    current: {
      title: (elements && elements.title) || null,
      titleLength: (elements && elements.titleLength) || 0,
      metaDescription: (elements && elements.metaDescription) || null,
      h1: (elements && elements.h1) || null,
    },
    contentFlags: {
      hasFlightTime: !!c.hasFlightTime,
      hasDirectInfo: !!c.hasDirectInfo,
      hasPrice: !!c.hasPrice,
      hasDistance: !!c.hasDistance,
      hasAirlines: !!c.hasAirlines,
      faqCount: c.faqCount || 0,
    },
    // The ONLY concrete facts the model may state — extracted off the real page.
    verifiedFacts: (elements && elements.facts) || {},
    gsc: gsc
      ? {
          impressions: gsc.impressions ?? null,
          clicks: gsc.clicks ?? null,
          position: gsc.position ?? null,
          ctr: ctr == null ? null : Number((ctr * 100).toFixed(2)) + '%',
        }
      : null,
  }, null, 2);
}

function ruleFallback(payload) {
  return buildOptimizationSuggestions({
    elements: payload.elements || {},
    gsc: payload.gsc || null,
    dominantIntent: payload.dominantIntent || null,
    lang: payload.lang || 'de',
  });
}

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const elements = payload && payload.elements;
  if (!elements || typeof elements !== 'object') {
    return NextResponse.json({ ok: false, error: 'Missing page elements' }, { status: 400 });
  }
  const lang = typeof payload.lang === 'string' ? payload.lang : 'de';
  const dominantIntent = typeof payload.dominantIntent === 'string' ? payload.dominantIntent : null;
  const gsc = payload.gsc && typeof payload.gsc === 'object' ? payload.gsc : null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // No key, or a language the AI prompt won't write → deterministic rule engine.
  if (!apiKey || !SUPPORTED_LANGS.has(lang)) {
    return NextResponse.json({ ok: true, source: 'rules', suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this route page and return the JSON suggestion.\n\n${buildUserContent({ elements, gsc, dominantIntent, lang })}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: SUGGESTION_SCHEMA } },
    });

    // A safety refusal → fall back to the rule engine rather than surfacing nothing.
    if (msg.stop_reason === 'refusal') {
      return NextResponse.json({ ok: true, source: 'rules', note: 'AI refused; used rules.', suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
    }

    const textBlock = (msg.content || []).find((b) => b.type === 'text');
    const parsed = textBlock ? JSON.parse(textBlock.text) : null;
    if (!parsed || typeof parsed !== 'object') throw new Error('Empty AI output');

    return NextResponse.json({ ok: true, source: 'ai', model: MODEL, suggestions: parsed });
  } catch (e) {
    // Any AI failure (network, parse, quota) degrades gracefully to the rules path.
    return NextResponse.json({ ok: true, source: 'rules', note: `AI unavailable (${e && e.message ? e.message : 'error'}); used rules.`, suggestions: ruleFallback({ elements, gsc, dominantIntent, lang }) });
  }
}
