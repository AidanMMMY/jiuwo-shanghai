import Image from 'next/image';
import Link from 'next/link';
import type { EventItemResolved } from '@/lib/data';

export default function PastEventsGrid({
  events,
  isZh,
}: {
  events: EventItemResolved[];
  isZh: boolean;
}) {
  const t = (en: string, zh: string) => (isZh ? zh : en);
  const basePath = isZh ? '/zh/special' : '/special';

  return (
    <main className="bg-[#0a0a0a] min-h-[100lvh]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-24 md:py-32">
        {/* Section heading */}
        <div className="text-center mb-16">
          <p
            className="text-xs tracking-[0.2em] text-[#c9a227] mb-4"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {t('PAST EVENTS', '往期活动')}
          </p>
          <h1
            className="text-xl md:text-2xl text-[#a0a0a0] tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 400 }}
          >
            {t('Memories', '回忆')}
          </h1>
        </div>

        {/* Empty state */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-[#666] tracking-wider italic">
              {t(
                'No past events yet. Check back after our first event!',
                '暂无往期活动，敬请期待首次活动！'
              )}
            </p>
          </div>
        ) : (
          /* Event cards grid */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {events.map((event) => (
              <Link
                key={event.slug}
                href={`${basePath}/${event.slug}`}
                className="group block"
              >
                {/* Cover image — uses event.cover, falls back to event.poster */}
                <div className="relative overflow-hidden rounded-lg mb-4 bg-[#0e0e0e]">
                  <Image
                    src={event.cover || event.poster}
                    alt={t(event.title, event.titleZh)}
                    width={800}
                    height={600}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 256px"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                  {/* Border glow on hover */}
                  <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-[#c9a227]/30 transition-all duration-300 pointer-events-none" />
                </div>

                {/* Event info */}
                <div>
                  <p className="text-[10px] tracking-[0.15em] text-[#c9a227]/70 mb-1">
                    {t(event.dateDisplay, event.dateDisplayZh)}
                  </p>
                  <h3
                    className="text-base md:text-lg text-[#f5f5f0] tracking-[0.06em] group-hover:text-[#c9a227] transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
                  >
                    {t(event.title, event.titleZh)}
                  </h3>
                  {event.hostName && (
                    <p className="text-sm text-[#a0a0a0] mt-0.5 tracking-wider">
                      {event.hostName}
                    </p>
                  )}
                  <p className="text-xs text-[#808080] mt-1.5 leading-relaxed line-clamp-2">
                    {t(event.subtitle, event.subtitleZh)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
