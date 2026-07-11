// Server Component shell — all data fetching/mutation for this tab is
// interactive (search/filter/paginate/create/edit/delete), so it lives
// entirely in the Client Component below rather than here.
import RoutePagesClient from './RoutePagesClient';

export default function RoutePagesPage() {
  return <RoutePagesClient />;
}
