import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import PastEventsGrid from '@/app/components/pages/PastEventsGrid';
import { getUpcomingEventsZh, getPastEventsZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '特别活动',
  description: 'JIUWO 啾喔的特别活动与美好回忆。',
};

export default async function Page() {
  const [upcomingEvents, pastEvents] = await Promise.all([
    getUpcomingEventsZh(),
    getPastEventsZh(),
  ]);

  // If there's an upcoming event, redirect to its detail page
  if (upcomingEvents.length > 0) {
    return permanentRedirect(`/zh/special/${upcomingEvents[0].slug}`);
  }

  // Otherwise, show past events archive
  return <PastEventsGrid events={pastEvents} isZh={true} />;
}
