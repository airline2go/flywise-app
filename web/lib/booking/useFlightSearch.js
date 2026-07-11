'use client';

// Ports app.js's doSearch() request/retry/tracking logic (the parts that
// aren't UI): up to 3 attempts, a 20s per-attempt abort timeout tuned
// for the free-tier backend's cold start, escalating retry messaging
// (5s wait after attempt 1, 3s after attempt 2), and the
// search_started/search_results_loaded/search_no_results/api_error
// tracking events. Deliberately does NOT fire app.js's old bare
// "search" and "search_results" events — both were redundant
// duplicates of search_results_loaded, an artifact of the old code's
// two-parallel-results-container architecture (see the B2 research
// notes) rather than a deliberate product decision; consolidated here
// instead of replicated.
import { useEffect, useRef, useState } from 'react';
import { search as searchApi } from '../booking-api';
import { trackEvent } from './analytics';

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [5000, 3000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// `payload` shape matches booking-api.js's search(): either the simple
// {origin, destination, departure_date, return_date?, cabin_class,
// adults, children, infants} or the multi-city {slices, cabin_class,
// adults, children, infants}. Pass `null` to skip searching (e.g. while
// required fields are still missing).
function useFlightSearch(payload, trackingParams) {
  const [state, setState] = useState({ status: payload ? 'loading' : 'idle', offers: [], error: '', retrySub: '' });
  const abortRef = useRef(null);

  useEffect(() => {
    if (!payload) {
      const t = setTimeout(() => setState({ status: 'idle', offers: [], error: '', retrySub: '' }), 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // [SET-STATE-IN-EFFECT] Deferred one tick, same reasoning as every
    // other call in this effect (they all run inside the async IIFE
    // below, i.e. after an await, not synchronously in the effect body)
    // — kept consistent rather than a one-off exception.
    const startTimer = setTimeout(() => {
      setState({ status: 'loading', offers: [], error: '', retrySub: '' });
      trackEvent('search_started', trackingParams);
    }, 0);

    (async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const attemptTimer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
        try {
          const { ok, data } = await searchApi(payload, controller.signal);
          clearTimeout(attemptTimer);
          if (cancelled) return;
          if (!ok) throw new Error(data.error || 'search failed');
          const offers = data.offers || [];
          if (offers.length) trackEvent('search_results_loaded', { ...trackingParams, results_count: offers.length });
          else trackEvent('search_no_results', trackingParams);
          setState({ status: offers.length ? 'success' : 'empty', offers, error: '', retrySub: '' });
          return;
        } catch (err) {
          clearTimeout(attemptTimer);
          if (cancelled) return;
          if (attempt === MAX_ATTEMPTS) {
            trackEvent('api_error', { endpoint: '/search', message: err.message });
            if (!cancelled) setState({ status: 'error', offers: [], error: err.message, retrySub: '' });
            return;
          }
          const delay = RETRY_DELAYS_MS[attempt - 1];
          const retrySub = attempt === 1 ? 'cold-start' : 'retry';
          if (!cancelled) setState((prev) => ({ ...prev, retrySub, retryAttempt: attempt }));
          await sleep(delay);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(startTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  return state;
}

export { useFlightSearch };
