import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntries, getJournalEntry } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) notFound();

  return <JournalPage entry={entry} backLabel="← Back to home" />;
}
