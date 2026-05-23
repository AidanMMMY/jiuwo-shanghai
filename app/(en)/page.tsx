import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

const guestbookLabels: GuestbookHookLabels = {
  countText: 'stamps so far',
  cta: 'Leave your own',
};

export default async function Page() {
  const [site, slides, entries, guestbookEntries, guestbookTotal] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
    listEntries(5),
    countEntries(),
  ]);

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="Updates"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/guestbook"
    />
  );
}
