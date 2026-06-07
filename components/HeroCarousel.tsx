'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { HeroSlide } from '@/lib/data';

function AnimatedTitle({ text }: { text: string }) {
  return (
    <h1
      className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl tracking-[0.14em] hero-title-shine"
      style={{
        fontFamily: 'var(--font-bodoni), Georgia, serif',
        fontWeight: 700,
        textShadow: '0 2px 20px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.3)',
      }}
    >
      {text}
    </h1>
  );
}

export default function HeroCarousel({
  slides,
  title,
  tagline,
  specialEvent,
  isZh,
}: {
  slides: HeroSlide[];
  title: string;
  tagline: string;
  specialEvent?: { hero: string; hostName?: string; href?: string };
  isZh?: boolean;
}) {
  const duration = slides.length * 3;
  const step = 100 / slides.length;
  const fade = 100 / duration;

  return (
    <section className="relative h-screen w-full overflow-hidden" style={{ height: '100svh' }}>
      {/* Background slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className="absolute inset-0 opacity-0"
          style={{
            animation: `heroFade ${duration}s infinite`,
            animationDelay: `${-index * 3}s`,
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>
      ))}

      {/* Title & Tagline — name/tagline position locked */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
        style={{ paddingBottom: 'clamp(10rem, 25vh, 18rem)' }}
      >
        <div className="hero-title-breathe hero-normal-title">
          <AnimatedTitle text={title} />
        </div>
        <div className="hero-title-breathe hero-darkroom-title hidden">
          <AnimatedTitle text="JIUWO — After Hours" />
        </div>
        <p
          className="mt-5 text-xl md:text-2xl lg:text-3xl tracking-wide text-[#f5f5f0]"
          style={{
            opacity: 0,
            animation: 'taglineEntrance 800ms cubic-bezier(0.16, 1, 0.3, 1) 800ms forwards, taglineShimmer 4s ease-in-out 1600ms infinite',
            WebkitMaskImage:
              'linear-gradient(110deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.3) 100%)',
            maskImage:
              'linear-gradient(110deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.3) 100%)',
            WebkitMaskSize: '300% 100%',
            maskSize: '300% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          }}
        >
          {tagline}
        </p>
      </div>

      {/* Special Event Entry — absolute positioned below title/tagline */}
      {specialEvent && (
        <div
          className="z-10 flex justify-center pointer-events-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 'clamp(8rem, 16vh, 14rem)' }}
        >
          {specialEvent.href ? (
            <Link
              href={specialEvent.href}
              className="event-entry-wrapper pointer-events-auto cursor-pointer group"
              style={{
                opacity: 0,
                animation: 'taglineEntrance 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards',
              }}
            >
              {/* Aurora background */}
              <div className="event-aurora-bg" aria-hidden="true" />
              {/* Content */}
              <div className="relative rounded-xl bg-[#0f0f0f]/08 border border-[#c9a227]/20 px-6 py-3.5 inline-flex flex-col items-center gap-2 shadow-[0_0_18px_rgba(201,162,39,0.08),inset_0_0_16px_rgba(201,162,39,0.05)] transition-all duration-300 group-hover:border-[#c9a227]/50 group-hover:shadow-[0_0_24px_rgba(201,162,39,0.12),inset_0_0_20px_rgba(201,162,39,0.06)]">
                {/* Line 1: hero text with shimmer */}
                <span className="text-xs md:text-sm tracking-wider event-text-shimmer">
                  {specialEvent.hero}
                </span>
                {/* Line 2: host name with dual lines + arrow */}
                {specialEvent.hostName && (
                  <span className="inline-flex items-center gap-3">
                    <span className="event-line group-hover:w-12 md:group-hover:w-20 transition-all duration-300" />
                    <span
                      className="text-xl md:text-2xl tracking-[0.22em] event-name-shimmer group-hover:drop-shadow-[0_0_10px_rgba(201,162,39,0.45)] transition-all duration-300"
                      style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
                    >
                      {specialEvent.hostName}
                    </span>
                    <span className="event-line event-line-r group-hover:w-12 md:group-hover:w-20 transition-all duration-300" />
                  </span>
                )}
                {/* Click hint */}
                <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] md:text-xs tracking-[0.2em] text-[#c9a227]/80 group-hover:text-[#c9a227] transition-colors duration-300">
                  <span className="event-arrow inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  <span>VIEW DETAILS</span>
                </span>
              </div>
            </Link>
          ) : (
            <div
              className="event-entry-wrapper group"
              style={{
                opacity: 0,
                animation: 'taglineEntrance 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards',
              }}
            >
              {/* Aurora background */}
              <div className="event-aurora-bg" aria-hidden="true" />
              {/* Content */}
              <div className="relative rounded-xl bg-[#0f0f0f]/60 border border-[#c9a227]/20 px-6 py-3.5 inline-flex flex-col items-center gap-2">
                {/* Line 1: hero text with shimmer */}
                <span className="text-sm md:text-base tracking-wider event-text-shimmer">
                  {specialEvent.hero}
                </span>
                {/* Line 2: host name with dual lines + arrow */}
                {specialEvent.hostName && (
                  <span className="inline-flex items-center gap-3">
                    <span className="event-line" />
                    <span
                      className="text-xl md:text-2xl tracking-[0.22em] event-name-shimmer"
                      style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
                    >
                      {specialEvent.hostName}
                    </span>
                    <span className="event-line event-line-r" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtitle: BAR • SHANGHAI */}
      <div
        className="z-10 flex justify-center pointer-events-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 'clamp(3rem, 7vh, 6rem)' }}
      >
        <Link
          href={isZh ? '/zh/about' : '/about'}
          className="hero-intro-fade-up pointer-events-auto text-xs md:text-sm uppercase tracking-[0.3em] text-[#c9a227]/70 hover:text-[#c9a227] transition-colors duration-300"
          style={{ opacity: 0, animation: 'heroIntroFadeUp 1400ms cubic-bezier(0.16, 1, 0.3, 1) 1000ms both' }}
        >
          BAR <span className="mx-1.5">•</span> JULU RD <span className="mx-1.5">•</span> SHANGHAI
        </Link>
      </div>

      {/* Scroll hint */}
      <div
        className="scroll-hint z-10 flex justify-center"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 'clamp(0.5rem, 1.5vh, 1.5rem)' }}
        aria-hidden="true"
      >
        <svg
          width="24"
          height="22"
          viewBox="0 0 24 22"
          fill="none"
          stroke="#c9a227"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2,8 12,2 22,8" />
          <polyline points="2,20 12,14 22,20" opacity="0.5" />
        </svg>
      </div>

      {/* Bottom gradient fade into black */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent pointer-events-none z-[5]" />

      <style>{`
        @keyframes heroFade {
          0% { opacity: 1; }
          ${step - fade}% { opacity: 1; }
          ${step}% { opacity: 0; }
          ${100 - fade}% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ── After Hours Darkroom Overrides ── */
        body.darkroom .hero-normal-title,
        body.darkroom .hero-normal-icons { display: none !important; }
        body.darkroom .hero-darkroom-title,
        body.darkroom .hero-darkroom-icons { display: flex !important; }
      `}</style>
    </section>
  );
}
