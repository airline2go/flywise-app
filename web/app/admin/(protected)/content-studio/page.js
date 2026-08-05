// Server Component shell — the Content Studio is fully interactive (scoring +
// generation happen client-side on the pure lib/social engines), so it lives
// entirely in the Client Component below.
import ContentStudioClient from './ContentStudioClient';

export default function ContentStudioPage() {
  return <ContentStudioClient />;
}
