import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntriesZh, getSiteDataZh } from '@/lib/data';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

const guestbookLabels: GuestbookHookLabels = {
  countText: '枚印章',
  cta: '留下你的',
};

export default async function Page() {
  const [site, slides, entries, guestbookEntries, guestbookTotal] = await Promise.all([
    getSiteDataZh(),
    getHeroSlides(),
    getJournalEntriesZh(),
    listEntries(5),
    countEntries(),
  ]);

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="最新动态"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/zh/guestbook"
    />
  );
}
