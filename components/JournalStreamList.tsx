'use client';

import { useState, useEffect, useRef } from 'react';
import JournalEntryWithLikes from './JournalEntryWithLikes';
import type { JournalEntry } from '@/lib/data';

type Entry = JournalEntry & { contentHtml: string };

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function RevealWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

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
    <section className="py-20 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl">
        {/* Section header with decorative lines */}
        <div className="flex items-center gap-6 mb-14">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
          <h2 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide shrink-0">
            {title ?? 'Journal'}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
        </div>

        <div className="space-y-16">
          {visibleEntries.map((entry, index) => (
            <RevealWrapper key={entry.slug} delay={index % 3 * 80}>
              <JournalEntryWithLikes entry={entry} />
            </RevealWrapper>
          ))}
        </div>

        {hasMore && (
          <div className="mt-16 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="group relative px-8 py-2.5 text-sm tracking-wider text-[#a0a0a0] border border-[#333] rounded-sm hover:text-[#f5f5f0] hover:border-[#c9a227] transition-all duration-300"
            >
              <span className="relative z-10">Load more</span>
              <span className="absolute inset-0 bg-[#c9a227]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        )}

        {/* Gold divider leading into Guestbook */}
        <div className="mt-20 flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c9a227]/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#c9a227]/40" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c9a227]/30" />
        </div>
      </div>
    </section>
  );
}
