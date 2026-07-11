import '../../../../styles/styles.css';
import ResultsClient from '../../../../lib/booking/ResultsClient';

export const metadata = { robots: 'noindex, follow' };

export default function MultiCitySearchResultsPage() {
  return <ResultsClient origin={null} destination={null} trip="mc" departDate={null} returnDate={null} />;
}
