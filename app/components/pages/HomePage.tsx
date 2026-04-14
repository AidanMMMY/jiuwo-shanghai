import HeroCarousel from '@/components/HeroCarousel';
import JournalList from '@/components/JournalList';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} />
      <JournalList entries={entries} title={journalTitle} />
    </>
  );
}
