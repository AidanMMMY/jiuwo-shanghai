import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntriesZh, getJournalEntryZh } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntriesZh();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getJournalEntryZh(slug);
  if (!entry) notFound();

  return <JournalPage entry={entry} backLabel="← 返回首页" />;
}
