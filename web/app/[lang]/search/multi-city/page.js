import { stringsFor } from '../../../../lib/translate';
import ResultsClient from '../../../../lib/booking/ResultsClient';

export const metadata = { robots: 'noindex, follow' };

export default async function MultiCitySearchResultsPage({ params }) {
  const { lang } = await params;
  const t = stringsFor(lang);
  return <ResultsClient origin={null} destination={null} trip="mc" departDate={null} returnDate={null} t={t} />;
}
