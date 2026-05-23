import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
import GuestbookHook from '@/components/GuestbookHook';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';
import type { GuestbookEntry, GuestbookHookLabels } from '@/lib/guestbook';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
  guestbookEntries,
  guestbookTotal,
  guestbookLabels,
  guestbookHref,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
  guestbookEntries: GuestbookEntry[];
  guestbookTotal: number;
  guestbookLabels: GuestbookHookLabels;
  guestbookHref: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} intro={site.intro} />
      <JournalStream entries={entries} title={journalTitle} />
      <GuestbookHook
        entries={guestbookEntries}
        totalCount={guestbookTotal}
        labels={guestbookLabels}
        href={guestbookHref}
      />
    </>
  );
}
