import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntriesZh, getJournalEntryZh } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntriesZh();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getJournalEntryZh(slug);
  if (!entry) return {};

  const description = entry.content.slice(0, 160).replace(/\s+/g, ' ').trim() + '...';

  return {
    title: entry.title,
    description,
    alternates: { canonical: `/zh/updates/${slug}` },
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
  const entry = await getJournalEntryZh(slug);
  if (!entry) notFound();

  return <JournalPage entry={entry} backLabel="← 返回首页" backHref="/zh" />;
}
