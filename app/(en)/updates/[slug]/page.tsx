import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntries, getJournalEntry, getJournalEntryDarkroom } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) return {};

  const description = entry.content.slice(0, 160).replace(/\s+/g, ' ').trim() + '...';

  return {
    title: entry.title,
    description,
    alternates: { canonical: `/updates/${slug}` },
    openGraph: entry.cover
      ? {
          title: entry.title,
          description,
          images: [{ url: entry.cover, alt: entry.title }],
        }
      : undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [entry, entryDarkroom] = await Promise.all([
    getJournalEntry(slug),
    getJournalEntryDarkroom(slug),
  ]);
  if (!entry) notFound();

  return (
    <JournalPage
      entry={entry}
      entryDarkroom={entryDarkroom}
      backLabel="← Back to home"
    />
  );
}
