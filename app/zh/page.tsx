import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlidesZh, getJournalEntriesZh, getSiteDataZh } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteDataZh(),
    getHeroSlidesZh(),
    getJournalEntriesZh(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="日记" />;
}
