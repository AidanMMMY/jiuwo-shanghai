import JournalCard from './JournalCard';
import type { JournalEntry } from '@/lib/data';

export default function JournalList({ entries, title, basePath = '' }: { entries: JournalEntry[]; title?: string; basePath?: string }) {
  return (
    <section className="py-20 px-4 md:px-8 bg-[#0a0a0a]">
      <div className="mx-auto">
        <h2 className="text-4xl font-semibold text-[#f5f5f0] tracking-wide mb-12">{title ?? 'Journal'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map((entry) => (
            <JournalCard key={entry.slug} entry={entry} basePath={basePath} />
          ))}
        </div>
      </div>
    </section>
  );
}
