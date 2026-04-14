import HeroCarousel from '@/components/HeroCarousel';
import JournalList from '@/components/JournalList';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
  basePath = '',
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
  basePath?: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} />
      <JournalList entries={entries} title={journalTitle} basePath={basePath} />
    </>
  );
}
