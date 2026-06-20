import type { Metadata } from 'next';
import HomePage from '@/app/components/pages/HomePage';
import DarkroomClassRestorer from '@/components/DarkroomClassRestorer';
import { getHeroSlides, getJournalEntries, getJournalEntriesDarkroom, getSiteData, getUpcomingEvents, getFeatured, getCalendarEvents } from '@/lib/data';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

export const metadata: Metadata = {
  description:
    "JIUWO — a queer-friendly cocktail bar on Julu Road, Shanghai. Natural wines, craft cocktails, and a warm, welcoming space. Open Tue–Sun 7pm–2am.",
  alternates: { canonical: '/' },
};

const guestbookLabels: GuestbookHookLabels = {
  countText: 'stamps so far',
  cta: 'Leave your own',
};

export default async function Page() {
  const [site, slides, entries, entriesDarkroom, guestbookEntries, guestbookTotal, upcomingEvents, featured, calendarEvents] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
    getJournalEntriesDarkroom(),
    listEntries(10),
    countEntries(),
    getUpcomingEvents(),
    getFeatured().catch(() => undefined),
    getCalendarEvents().catch(() => undefined),
  ]);

  const upcomingEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const specialEventCard = site.specialEvent?.enabled
    ? {
        hero: upcomingEvent
          ? upcomingEvent.label
          : site.specialEvent.heroFallback,
        hostName: upcomingEvent?.hostName,
        href: upcomingEvent
          ? `/special/${upcomingEvent.slug}`
          : '/special',
        isUpcoming: !!upcomingEvent,
      }
    : undefined;

  return (
    <>
      <DarkroomClassRestorer />
      <HomePage
        site={site}
        slides={slides}
        entries={entries}
        entriesDarkroom={entriesDarkroom}
        journalTitle="Updates"
        guestbookEntries={guestbookEntries}
        guestbookTotal={guestbookTotal}
        guestbookLabels={guestbookLabels}
        guestbookHref="/guestbook"
        isZh={false}
        specialEventCard={specialEventCard}
        featured={featured}
        calendarEvents={calendarEvents}
      />
    </>
  );
}
