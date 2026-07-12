import { notFound } from 'next/navigation';
import '../../../../styles/styles.css';
import ResultsClient from '../../../../lib/booking/ResultsClient';
import { resolveDeepLinkDates } from '../../../../lib/booking/dateDefaults';

const PAIR_RE = /^([A-Za-z]{3})-([A-Za-z]{3})$/;

export const metadata = { robots: 'noindex, follow' };

export default async function SearchResultsPage({ params, searchParams }) {
  const { lang, pair } = await params;
  const sp = await searchParams;
  const match = PAIR_RE.exec(pair);
  if (!match) notFound();
  const origin = match[1].toUpperCase();
  const destination = match[2].toUpperCase();
  const trip = sp.trip === 'rr' || sp.trip === 'mc' ? sp.trip : 'ow';
  const { departDate, returnDate } = resolveDeepLinkDates(sp, trip);

  return (
    <ResultsClient
      origin={origin}
      destination={destination}
      trip={trip}
      departDate={departDate}
      returnDate={returnDate}
      lang={lang}
    />
  );
}
