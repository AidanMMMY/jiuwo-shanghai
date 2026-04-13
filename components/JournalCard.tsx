import Image from 'next/image';
import Link from 'next/link';
import type { JournalEntry } from '@/lib/data';

export default function JournalCard({ entry }: { entry: JournalEntry }) {
  const summary = entry.content.slice(0, 100) + (entry.content.length > 100 ? '…' : '');

  return (
    <article className="group">
      <Link href={`/journal/${entry.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg mb-4">
          <Image
            src={entry.cover}
            alt={entry.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <time className="text-xs text-[#a0a0a0]">{entry.date}</time>
        <h2 className="text-xl font-medium text-[#f5f5f0] mt-1 mb-2 group-hover:text-[#c9a227] transition-colors">
          {entry.title}
        </h2>
        <p className="text-sm text-[#a0a0a0] leading-relaxed">{summary}</p>
      </Link>
    </article>
  );
}
