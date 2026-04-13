import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJournalEntries, getJournalEntry } from '@/lib/data';
import { markdownToHtml } from '@/lib/utils';

export async function generateStaticParams() {
  const entries = await getJournalEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) notFound();

  const contentHtml = await markdownToHtml(entry.content);

  return (
    <article className="pt-24 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          ← 返回首页
        </Link>
        <header className="mt-8 mb-10">
          <time className="text-sm text-[#a0a0a0]">{entry.date}</time>
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] mt-2 tracking-wide">
            {entry.title}
          </h1>
        </header>
        <div className="relative aspect-[16/9] w-full mb-10 rounded-lg overflow-hidden">
          <Image src={entry.cover} alt={entry.title} fill className="object-cover" />
        </div>
        <div
          className="prose prose-invert prose-stone max-w-none prose-headings:text-[#f5f5f0] prose-p:text-[#a0a0a0] prose-a:text-[#c9a227]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </article>
  );
}
