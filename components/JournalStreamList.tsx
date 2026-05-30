'use client';

import { useState } from 'react';
import JournalEntryWithLikes from './JournalEntryWithLikes';
import type { JournalEntry } from '@/lib/data';

type Entry = JournalEntry & { contentHtml: string };

export default function JournalStreamList({
  entries,
  title,
}: {
  entries: Entry[];
  title?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <section className="py-14 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-4xl font-semibold text-[#f5f5f0] tracking-wide mb-8">{title ?? 'Journal'}</h2>
        <div className="space-y-16">
          {visibleEntries.map((entry) => (
            <JournalEntryWithLikes key={entry.slug} entry={entry} />
          ))}
        </div>
        {hasMore && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="px-6 py-2 text-sm text-[#a0a0a0] border border-[#333] rounded hover:text-[#f5f5f0] hover:border-[#555] transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
