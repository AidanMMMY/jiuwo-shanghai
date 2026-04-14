import JournalCard from './JournalCard';
import type { JournalEntry } from '@/lib/data';

export default function JournalList({ entries, title, basePath = '' }: { entries: JournalEntry[]; title?: string; basePath?: string }) {
  return (
    <section className="py-20 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{title ?? 'Journal'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map((entry) => (
            <JournalCard key={entry.slug} entry={entry} basePath={basePath} />
          ))}
        </div>
      </div>
    </section>
  );
}
