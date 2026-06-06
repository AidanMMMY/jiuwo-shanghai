import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import PastEventsGrid from '@/app/components/pages/PastEventsGrid';
import { getUpcomingEvents, getPastEvents } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Special Events',
  description: 'Special events and memories from JIUWO Shanghai.',
};

export default async function Page() {
  const [upcomingEvents, pastEvents] = await Promise.all([
    getUpcomingEvents(),
    getPastEvents(),
  ]);

  // If there's an upcoming event, redirect to its detail page
  if (upcomingEvents.length > 0) {
    return permanentRedirect(`/special/${upcomingEvents[0].slug}`);
  }

  // Otherwise, show past events archive
  return <PastEventsGrid events={pastEvents} isZh={false} />;
}
