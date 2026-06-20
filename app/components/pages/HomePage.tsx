import HeroCarousel from '@/components/HeroCarousel';
import GuestbookHook from '@/components/GuestbookHook';
import AfterHoursGateway from '@/components/AfterHoursGateway';
import DrinkSpotlight from '@/components/DrinkSpotlight';
import EventCalendar from '@/components/EventCalendar';
import type { HeroSlide, SiteData, FeaturedData, CalendarEventsData } from '@/lib/data';
import type { GuestbookEntry, GuestbookHookLabels } from '@/lib/guestbook';

export default function HomePage({
  site,
  slides,
  guestbookEntries,
  guestbookTotal,
  guestbookLabels,
  guestbookHref,
  isZh,
  specialEventCard,
  featured,
  calendarEvents,
}: {
  site: SiteData;
  slides: HeroSlide[];
  guestbookEntries: GuestbookEntry[];
  guestbookTotal: number;
  guestbookLabels: GuestbookHookLabels;
  guestbookHref: string;
  isZh?: boolean;
  specialEventCard?: { hero: string; hostName?: string; href: string; isUpcoming?: boolean };
  featured?: FeaturedData;
  calendarEvents?: CalendarEventsData;
}) {
  return (
    <>
      <HeroCarousel
        slides={slides}
        title={site.name}
        tagline={site.tagline}
        specialEvent={specialEventCard}
        isZh={isZh}
      />
      <AfterHoursGateway isZh={isZh} />
      {featured && <DrinkSpotlight data={featured} isZh={isZh} />}
      {calendarEvents && <EventCalendar data={calendarEvents} isZh={isZh} />}
      <GuestbookHook
        entries={guestbookEntries}
        totalCount={guestbookTotal}
        labels={guestbookLabels}
        href={guestbookHref}
      />
    </>
  );
}
