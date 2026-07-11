import { notFound } from 'next/navigation';
import '../../../../styles/styles.css';
import ResultsClient from '../../../../lib/booking/ResultsClient';
import { resolveDeepLinkDates } from '../../../../lib/booking/dateDefaults';

const PAIR_RE = /^([A-Za-z]{3})-([A-Za-z]{3})$/;

export const metadata = { robots: 'noindex, follow' };

export default async function SearchResultsPage({ params, searchParams }) {
  const { pair } = await params;
  const sp = await searchParams;
  const match = PAIR_RE.exec(pair);
  if (!match) notFound();
  const origin = match[1].toUpperCase();
  const destination = match[2].toUpperCase();
  // [ROUTE-LINK-DEFAULT] A bare deep link with no ?trip= (e.g. an entity
  // page's "search flights" CTA) defaults to one-way, matching app.js's
  // handleUrlAutoSearch() — only an explicit ?trip=rr from the search
  // form itself opts into round-trip.
  const trip = sp.trip === 'rr' || sp.trip === 'mc' ? sp.trip : 'ow';
  const { departDate, returnDate } = resolveDeepLinkDates(sp, trip);

  return (
    <ResultsClient
      origin={origin}
      destination={destination}
      trip={trip}
      departDate={departDate}
      returnDate={returnDate}
      lang="de"
    />
  );
}
