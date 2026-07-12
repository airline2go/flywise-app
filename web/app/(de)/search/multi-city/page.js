import '../../../../styles/styles.css';
import ResultsClient from '../../../../lib/booking/ResultsClient';

export const metadata = { robots: 'noindex, follow' };

// No canonical deep-link URL shape for multi-city exists in the old
// app either (per the B2 research notes) — legs live only in
// SearchProvider's context (ResultsClient reads search.mcLegs), not
// the URL, matching how app.js never persisted an mc search past the
// current tab.
export default function MultiCitySearchResultsPage() {
  return <ResultsClient origin={null} destination={null} trip="mc" departDate={null} returnDate={null} lang="de" />;
}
