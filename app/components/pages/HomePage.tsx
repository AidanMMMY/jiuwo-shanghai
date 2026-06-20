import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
import GuestbookHook from '@/components/GuestbookHook';
import AfterHoursGateway from '@/components/AfterHoursGateway';
import DrinkSpotlight from '@/components/DrinkSpotlight';
import type { HeroSlide, JournalEntry, SiteData, FeaturedData } from '@/lib/data';
import type { GuestbookEntry, GuestbookHookLabels } from '@/lib/guestbook';

export default function HomePage({
  site,
  slides,
  entries,
  entriesDarkroom,
  journalTitle,
  guestbookEntries,
  guestbookTotal,
  guestbookLabels,
  guestbookHref,
  isZh,
  specialEventCard,
  featured,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  entriesDarkroom?: JournalEntry[];
  journalTitle?: string;
  guestbookEntries: GuestbookEntry[];
  guestbookTotal: number;
  guestbookLabels: GuestbookHookLabels;
  guestbookHref: string;
  isZh?: boolean;
  specialEventCard?: { hero: string; hostName?: string; href: string; isUpcoming?: boolean };
  featured?: FeaturedData;
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
      <JournalStream entries={entries} entriesDarkroom={entriesDarkroom} title={journalTitle} />
      {featured && <DrinkSpotlight data={featured} isZh={isZh} />}
      <GuestbookHook
        entries={guestbookEntries}
        totalCount={guestbookTotal}
        labels={guestbookLabels}
        href={guestbookHref}
      />
    </>
  );
}
