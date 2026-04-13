import HeroCarousel from '@/components/HeroCarousel';
import JournalList from '@/components/JournalList';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';

export default async function HomePage() {
  const [site, slides, entries] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
  ]);

  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} />
      <JournalList entries={entries} />
    </>
  );
}
