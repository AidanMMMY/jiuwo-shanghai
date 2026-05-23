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
  return (
    <section className="bg-[#0a0a0a] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        {/* Count */}
        <p className="text-center text-sm tracking-wider text-[#a0a0a0] mb-10">
          —— {totalCount} {labels.countText} ——
        </p>

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="space-y-6 mb-10">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4"
              >
                <p className="text-base md:text-lg text-[#f5f5f0] leading-relaxed italic">
                  &ldquo;{entry.message}&rdquo;
                </p>
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
          <Link
            href={href}
            className="inline-block text-sm text-[#c9a227] tracking-wider hover:underline"
          >
            {labels.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
