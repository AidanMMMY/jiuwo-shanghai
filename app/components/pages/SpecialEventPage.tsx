import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';

interface SpecialEvent {
  label: string;
  title: string;
  date: string;
}

export default function SpecialEventPage({
  event,
  backHref,
}: {
  event: SpecialEvent;
  backHref: string;
}) {
  return (
    <main className="relative bg-[#0a0a0a] min-h-screen">
      {/* Hero block */}
      <section className="relative z-10 w-full">
        <div className="flex flex-col items-center justify-center px-6 pt-32 md:pt-40 pb-12 text-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#c9a227]/60" />
            <span className="text-xs uppercase tracking-[0.3em] text-[#c9a227]">
              {event.label}
            </span>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#c9a227]/60" />
          </div>

          <ScrollReveal effect="title">
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-wide text-[#f5f5f0]"
              style={{
                fontFamily: 'var(--font-bodoni), Georgia, serif',
                textShadow: '0 0 40px rgba(201,162,39,0.2), 0 0 80px rgba(201,162,39,0.08)',
              }}
            >
              {event.title}
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* Details */}
      <section className="relative z-10 px-6 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 text-sm text-[#a0a0a0] border border-[#222] rounded-full px-5 py-2.5 mb-10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>{event.date}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal effect="text" delay={100}>
            <div className="space-y-6 text-base md:text-lg text-[#a0a0a0] leading-relaxed text-left">
              {/* Generic event placeholder — owner fills in via site.json later */}
              <p>
                One night only. Our bar counter belongs to a special guest —
                different hands, different rhythm, different stories.
                Come early for a seat at the bar. Stay late for the conversation.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pull quote style divider */}
      <section className="relative z-10 px-6 pb-16">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto h-px w-12 bg-[#c9a227] mb-8 divider-breathe" />
            <p className="text-xl md:text-2xl italic text-[#f5f5f0]/80">
              The bar is your stage for one night.
            </p>
            <div className="mx-auto h-px w-12 bg-[#c9a227] mt-8 divider-breathe" />
          </div>
        </ScrollReveal>
      </section>

      {/* Back link */}
      <section className="relative z-10 px-6 pb-24 text-center">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm tracking-wider text-[#a0a0a0] hover:text-[#c9a227] transition-colors duration-300"
        >
          <span>←</span>
          <span>Back to the night</span>
        </Link>
      </section>
    </main>
  );
}
