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
      <path d="M20 14c0 3.3-2.7 6-6 6s-6-2.7-6-6V6h12v8z" />
      <path d="M8 6c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M14 20v4" />
      <path d="M10 24h8" />
    </svg>
  );
}

function WineIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4v6c0 2.2 1.8 4 4 4s4-1.8 4-4V4" />
      <path d="M14 14v8" />
      <path d="M10 22h8" />
    </svg>
  );
}

function ShakerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h10l2 4H7l2-4z" />
      <path d="M8 7l3 18h6l3-18" />
      <path d="M11 12h6" />
      <path d="M12 17h4" />
    </svg>
  );
}

function LoveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 24C14 24 4 18 4 10.5C4 7.46 6.46 5 9.5 5C11.24 5 12.76 5.81 14 7.03C15.24 5.81 16.76 5 18.5 5C21.54 5 24 7.46 24 10.5C24 18 14 24 14 24Z" />
    </svg>
  );
}

export default function HeroCarousel({
  slides,
  title,
  tagline,
  intro,
}: {
  slides: HeroSlide[];
  title: string;
  tagline: string;
  intro: string;
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
        <div className="hero-title-breathe">
          <AnimatedTitle text={title} />
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

      {/* Drink icons */}
      <div
        className="z-10 px-6"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '4rem' }}
      >
        <div className="hero-intro-fade-up flex items-center justify-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/15">
            <TeaIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/15">
            <WineIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/15">
            <ShakerIcon />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/15">
            <LoveIcon />
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
        @media (prefers-reduced-motion: reduce) {
          .hero-title-breathe { animation: none !important; }
          .hero-title-shine { animation: none !important; background-position: 0% 50%; opacity: 1; transform: none; }
          .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .scroll-hint { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
