'use client';

import { useState, useCallback } from 'react';
import { StampIcon } from '@/components/StampIcon';
import { StampPanel } from '@/components/StampPanel';
import type { GuestbookEntry, StampId, GuestbookLabels } from '@/lib/guestbook';

function formatRelativeTime(dateStr: string, locale: 'en' | 'zh'): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'zh') {
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    return `${diffDays} 天前`;
  }

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function GuestbookPage({
  entries: initialEntries,
  totalCount,
  labels,
  locale,
}: {
  entries: GuestbookEntry[];
  totalCount: number;
  labels: GuestbookLabels;
  locale: 'en' | 'zh';
}) {
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [animatingEntryId, setAnimatingEntryId] = useState<number | null>(null);

  const handleNewEntry = useCallback((entry: GuestbookEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setAnimatingEntryId(entry.id);
    setTimeout(() => setAnimatingEntryId(null), 1000);
  }, []);

  return (
    <main className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="px-6 pt-20 pb-8 md:pt-28 md:pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl md:text-6xl font-medium tracking-widest text-[#f5f5f0]">
            {labels.title}
          </h1>
          <p className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-[#c9a227]">
            {labels.subtitle}
          </p>
        </div>
      </section>

      {/* CTA + Count */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-6">
          <button
            onClick={() => setIsPanelOpen(true)}
            className="px-8 py-3 border border-[#c9a227] text-[#c9a227] text-sm uppercase tracking-[0.2em] hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
          >
            {labels.cta}
          </button>
          <p className="text-sm tracking-wider text-[#a0a0a0]">
            —— {labels.countPrefix}{totalCount}{labels.countSuffix} ——
          </p>
        </div>
      </section>

      {/* Entries list */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl">
          {entries.length === 0 ? (
            <p className="text-center text-[#a0a0a0] py-16">{labels.emptyState}</p>
          ) : (
            <div className="space-y-0">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className={`py-6 border-b border-[#c9a22733] transition-all duration-700 ${
                    animatingEntryId === entry.id
                      ? 'opacity-0 -translate-y-4 animate-[fadeInDown_0.7s_ease-out_forwards]'
                      : ''
                  }`}
                >
                  <p className="text-lg md:text-xl text-[#f5f5f0] leading-relaxed">
                    &ldquo;{entry.message}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-[#c9a227] tracking-wider">
                      — {entry.name} · {formatRelativeTime(entry.created_at, locale)}
                    </p>
                    <StampIcon
                      stamp={entry.stamp as StampId}
                      size={28}
                      className="text-[#c9a227]"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stamp Panel */}
      <StampPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSuccess={handleNewEntry}
        labels={labels}
        locale={locale}
      />
    </main>
  );
}
