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
    <section className="bg-[#0a0a0a] px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        {/* Card container with subtle depth */}
        <div className="relative rounded-lg border-gradient bg-[#0e0e0e] overflow-hidden shadow-card shadow-card-hover">
          {/* Top gold accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent divider-breathe" />

          <Link href={href} className="block">
            {/* Header */}
            <div className="text-center pt-10 pb-8 md:pt-12 md:pb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-[#c9a227] mb-3">
                Guestbook
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#333]" />
                <p className="text-sm tracking-wider text-[#a0a0a0]">
                  {totalCount} {labels.countText}
                </p>
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#333]" />
              </div>
            </div>

            {/* Entries — styled like a board */}
            {entries.length > 0 && (
              <div className="px-6 md:px-10 pb-8">
                <div className="rounded-md border border-[#1a1a1a] bg-[#0a0a0a]/60 p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 group"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <StampIcon
                          stamp={entry.stamp as StampId}
                          size={22}
                          className="text-[#c9a227]/70 flex-shrink-0 mt-0.5 transition-colors group-hover:text-[#c9a227]"
                        />
                        <div className="min-w-0">
                          <p className="text-base md:text-lg text-[#f5f5f0]/90 leading-relaxed italic">
                            &ldquo;{entry.message}&rdquo;
                          </p>
                          <p className="text-sm text-[#c9a227]/80 mt-1.5 tracking-wider">
                            — {entry.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Link>

          {/* CTA */}
          <div className="text-center pb-10">
            <Link
              href={`${href}?write=1`}
              className="inline-flex items-center gap-2 text-sm tracking-wider text-[#c9a227] hover:text-[#f5f5f0] transition-colors duration-300 group"
            >
              <span>{labels.cta}</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
