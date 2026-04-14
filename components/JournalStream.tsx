import Image from 'next/image';
import { markdownToHtml } from '@/lib/utils';
import type { JournalEntry } from '@/lib/data';

export default async function JournalStream({ entries, title }: { entries: JournalEntry[]; title?: string }) {
  const htmlEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      contentHtml: await markdownToHtml(entry.content),
    }))
  );

  return (
    <section className="py-20 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{title ?? 'Journal'}</h2>
        <div className="space-y-16">
          {htmlEntries.map((entry) => (
            <article key={entry.slug} className="border-b border-[#222] pb-16 last:border-0">
              <time className="text-sm text-[#a0a0a0]">{entry.date}</time>
              <h3 className="text-2xl font-medium text-[#f5f5f0] mt-2 mb-6 tracking-wide">{entry.title}</h3>
              <div className="relative aspect-[16/9] w-full mb-8 rounded-lg overflow-hidden">
                <Image src={entry.cover} alt={entry.title} fill className="object-cover" />
              </div>
              <div
                className="prose prose-invert prose-stone max-w-none prose-headings:text-[#f5f5f0] prose-p:text-[#a0a0a0] prose-a:text-[#c9a227]"
                dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
