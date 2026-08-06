// Server Component shell — the calendar is fully interactive (fetch, filter,
// drag-and-drop reschedule), so it lives in the Client Component below.
import ContentCalendarClient from './ContentCalendarClient';

export default function ContentCalendarPage() {
  return <ContentCalendarClient />;
}
