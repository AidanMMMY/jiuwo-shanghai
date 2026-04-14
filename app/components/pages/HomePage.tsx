import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
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
      <JournalStream entries={entries} title={journalTitle} />
    </>
  );
}
