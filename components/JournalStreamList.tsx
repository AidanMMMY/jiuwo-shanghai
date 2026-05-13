'use client';

import Image from 'next/image';
import { useState } from 'react';
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
            <article key={entry.slug} className="border-b border-[#222] pb-14 pt-4 last:border-0">
              <time className="text-sm text-[#a0a0a0]">{entry.date}</time>
              <h3 className="text-2xl font-medium text-[#a0a0a0] mt-2 mb-6 tracking-wide">{entry.title}</h3>
              <div className="flex justify-center mb-8">
                <Image
                  src={entry.cover}
                  alt={entry.title}
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="max-w-full max-h-[66vh] w-auto h-auto rounded-lg object-contain"
                />
              </div>
              <div
                className="prose prose-invert prose-stone max-w-none prose-headings:text-[#f5f5f0] prose-p:text-[#a0a0a0] prose-a:text-[#c9a227] [&_img]:block [&_img]:mx-auto [&_img]:my-6 [&_img]:max-w-full [&_img]:max-h-[66vh] [&_img]:h-auto [&_img]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
              />
            </article>
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
