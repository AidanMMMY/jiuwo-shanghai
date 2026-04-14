import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="Journal" />;
}
