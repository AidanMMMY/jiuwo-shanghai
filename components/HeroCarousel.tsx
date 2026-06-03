'use client';

import Image from 'next/image';
import type { HeroSlide } from '@/lib/data';

function AnimatedTitle({ text }: { text: string }) {
  return (
    <h1
      className="text-6xl md:text-8xl lg:text-9xl tracking-[0.14em] hero-title-shine"
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

function TeaIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c0 2.8-2.2 5-5 5s-5-2.2-5-5V8h10v6z" />
      <path d="M9 8c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3" />
      <path d="M14 19v3" />
      <path d="M10 22h8" />
    </svg>
  );
}

function WineIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 7v5c0 1.7 1.3 3 3 3s3-1.3 3-3V7" />
      <path d="M14 15v5" />
      <path d="M10 20h8" />
    </svg>
  );
}

function ShakerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6h8l1.5 3H8.5L10 6z" />
      <path d="M9 9l2.5 11h5l2.5-11" />
      <path d="M11 12h6" />
      <path d="M11.5 15h5" />
    </svg>
  );
}

function LoveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18.5C10 18.5 5 15 5 10.5C5 8.5 6.5 7 8.5 7C9.8 7 10.7 7.6 11.5 8.5C12.3 7.6 13.2 7 14.5 7C16.5 7 18 8.5 18 10.5C18 15 10 18.5 10 18.5Z" />
      <path d="M17 16C17 16 13 13 13 9.5C13 8 14 7 15.5 7C16.5 7 17 7.4 17.5 8C18 7.4 18.5 7 19.5 7C21 7 22 8 22 9.5C22 13 17 16 17 16Z" />
    </svg>
  );
}

/* ── After Hours Icons ── */
function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="11" width="16" height="13" rx="2" />
      <path d="M9 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function ChairIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22h12" />
      <path d="M10 22V12a4 4 0 018 0v10" />
      <path d="M10 12h8" />
    </svg>
  );
}

function EmptyGlassIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 7v8c0 1.7 1.3 3 3 3s3-1.3 3-3V7" />
      <path d="M14 18v4" />
      <path d="M10 22h8" />
      <path d="M12 11h4" opacity="0.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.5A9 9 0 1111.5 6a7 7 0 0010.5 10.5z" />
    </svg>
  );
}

export default function HeroCarousel({
  slides,
  title,
  tagline,
  intro,
  specialEvent,
}: {
  slides: HeroSlide[];
  title: string;
  tagline: string;
  intro: string;
  specialEvent?: { hero: string; hostName?: string };
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
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
      ))}

      {/* Title & Tagline */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingBottom: '8rem' }}
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

        {/* Special Event Entry — dual-line B */}
        {specialEvent && (
          <span
            className="mt-12 inline-flex flex-col items-center gap-2"
            style={{
              opacity: 0,
              animation: 'taglineEntrance 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards',
            }}
          >
            {/* Line 1: hero text with shimmer */}
            <span className="text-xs md:text-sm tracking-wider event-text-shimmer">
              {specialEvent.hero}
            </span>
            {/* Line 2: host name with dual lines */}
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
          </span>
        )}
      </div>

      {/* Drink icons */}
      <div
        className="z-10 px-6"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '4rem' }}
      >
        <div className="hero-intro-fade-up flex items-center justify-center gap-5 hero-normal-icons">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#D4A838]/15 to-white/5 backdrop-blur-md border border-white/15">
            <TeaIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#A82A4A]/15 to-white/5 backdrop-blur-md border border-white/15">
            <WineIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#D87848]/15 to-white/5 backdrop-blur-md border border-white/15">
            <ShakerIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#D48878]/15 to-white/5 backdrop-blur-md border border-white/15">
            <LoveIcon />
          </div>
        </div>
        <div className="hero-intro-fade-up flex items-center justify-center gap-5 hero-darkroom-icons hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#666]/15 to-white/5 backdrop-blur-md border border-white/15">
            <LockIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#666]/15 to-white/5 backdrop-blur-md border border-white/15">
            <ChairIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#666]/15 to-white/5 backdrop-blur-md border border-white/15">
            <EmptyGlassIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-t from-[#666]/15 to-white/5 backdrop-blur-md border border-white/15">
            <MoonIcon />
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="scroll-hint z-10 flex justify-center"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '1rem' }}
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
        @keyframes taglineShimmer {
          0%, 5% { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
          85%, 100% { -webkit-mask-position: 0% 0; mask-position: 0% 0; }
        }
        @keyframes heroIntroFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollHintBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes titleEntrance {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes taglineEntrance {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes titleBreathe {
          0%, 100% { opacity: 0.94; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.005); }
        }
        @keyframes heroTitleShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 400% 50%; }
        }
        @keyframes eventTextShimmer {
          0%   { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
        .event-text-shimmer {
          background-image: linear-gradient(105deg,
            #a0a0a0 0%,
            #c9a227 25%,
            #dfc050 38%,
            #c9a227 50%,
            #a0a0a0 75%,
            #a0a0a0 100%);
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: eventTextShimmer 5s linear infinite;
          animation-delay: 2s;
        }
        .event-name-shimmer {
          background-image: linear-gradient(105deg,
            #c9a227 0%,
            #dfc050 20%,
            #f5e090 37%,
            #dfc050 50%,
            #c9a227 70%,
            #c9a227 100%);
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: eventTextShimmer 6s linear infinite;
          animation-delay: 2.5s;
        }
        .event-line {
          height: 1.5px;
          width: 2rem;
          background: linear-gradient(to right, rgba(201,162,39,0.05), rgba(201,162,39,0.3), rgba(201,162,39,0.7));
        }
        .event-line-r {
          background: linear-gradient(to left, rgba(201,162,39,0.05), rgba(201,162,39,0.3), rgba(201,162,39,0.7));
        }
        @media (min-width: 768px) {
          .event-line, .event-line-r { width: 3.5rem; }
        }

        .hero-title-breathe {
          animation: titleBreathe 5s ease-in-out infinite;
          animation-delay: 1.2s;
        }
        .hero-title-shine {
          display: inline-block;
          background-image: linear-gradient(105deg,
            #A82A4A 0%,
            #D48878 17%,
            #D4A838 34%,
            #E8C860 51%,
            #D87848 68%,
            #C06068 85%,
            #A82A4A 100%);
          background-size: 400% 100%;
          background-position: 0% 50%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation:
            titleEntrance 900ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both,
            heroTitleShine 12s linear 1.6s infinite;
        }
        .hero-intro-fade-up {
          animation: heroIntroFadeUp 1400ms cubic-bezier(0.16, 1, 0.3, 1) 1000ms both;
        }
        .scroll-hint {
          animation: scrollHintBounce 1.8s ease-in-out infinite;
        }
        .seal-glow {
          box-shadow: 0 0 14px rgba(201,162,39,0.12), 0 0 2px rgba(201,162,39,0.18);
          animation: sealGlow 3.2s ease-in-out infinite;
        }
        .seal-star {
          animation: sealStar 3.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-title-breathe { animation: none !important; }
          .hero-title-shine { animation: none !important; background-position: 0% 50%; opacity: 1; transform: none; }
          .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .scroll-hint { animation: none !important; }
          .event-text-shimmer { animation: none !important; background-image: none !important; color: #c9a227 !important; -webkit-text-fill-color: #c9a227 !important; }
          .event-name-shimmer { animation: none !important; background-image: none !important; color: #c9a227 !important; -webkit-text-fill-color: #c9a227 !important; }
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
