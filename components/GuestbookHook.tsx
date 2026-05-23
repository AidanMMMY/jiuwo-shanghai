import Link from 'next/link';
import { StampIcon } from './StampIcon';
import type { GuestbookEntry, StampId, GuestbookHookLabels } from '@/lib/guestbook';

export default function GuestbookHook({
  entries,
  totalCount,
  labels,
  href,
}: {
  entries: GuestbookEntry[];
  totalCount: number;
  labels: GuestbookHookLabels;
  href: string;
}) {
  const hrefWithPanel = `${href}?panel=open`;

  return (
    <Link href={hrefWithPanel} className="block">
      <section className="bg-[#0a0a0a] px-6 py-16 md:py-20 cursor-pointer hover:opacity-90 transition-opacity">
        <div className="mx-auto max-w-2xl">
          {/* Title */}
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c9a227] mb-2">
              Guestbook
            </p>
            <p className="text-sm tracking-wider text-[#a0a0a0]">
              —— {totalCount} {labels.countText} ——
            </p>
          </div>

          {/* Recent entries */}
          {entries.length > 0 && (
            <div className="space-y-6 mb-10">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg text-[#f5f5f0] leading-relaxed italic">
                      &ldquo;{entry.message}&rdquo;
                    </p>
                    <p className="text-sm text-[#c9a227] mt-1 tracking-wider">
                      — {entry.name}
                    </p>
                  </div>
                  <StampIcon
                    stamp={entry.stamp as StampId}
                    size={24}
                    className="text-[#c9a227] flex-shrink-0 mt-1"
                  />
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="text-center">
            <span className="inline-block text-sm text-[#c9a227] tracking-wider">
              {labels.cta} →
            </span>
          </div>
        </div>
      </section>
    </Link>
  );
}
