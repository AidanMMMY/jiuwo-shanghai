'use client';

import Image from 'next/image';
import type { HeroSlide } from '@/lib/data';

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

  function renderIntro(text: string) {
    return text.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
      part.startsWith('[[') && part.endsWith(']]')
        ? <span key={i} className="rainbow-text">{part.slice(2, -2)}</span>
        : part
    );
  }

  return (
    <section className="relative h-screen w-full overflow-hidden" style={{ height: '100svh' }}>
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
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ))}
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
        .hero-intro-fade-up {
          animation: heroIntroFadeUp 1400ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
        }
        @keyframes scrollHintBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .scroll-hint {
          animation: scrollHintBounce 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tagline-shimmer { animation: none !important; -webkit-mask-image: none !important; mask-image: none !important; }
          .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .scroll-hint { animation: none !important; }
        }
      `}</style>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingBottom: '8rem' }}
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-widest text-[#f5f5f0] mb-6">
          {title}
        </h1>
        <p
          className="tagline-shimmer text-xl md:text-2xl lg:text-3xl tracking-wide text-[#f5f5f0]"
          style={{
            WebkitMaskImage:
              'linear-gradient(110deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.3) 100%)',
            maskImage:
              'linear-gradient(110deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.3) 100%)',
            WebkitMaskSize: '300% 100%',
            maskSize: '300% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            animation: 'taglineShimmer 3s ease-in-out infinite',
          }}
        >
          {tagline}
        </p>
      </div>
      <div
        className="z-10 px-6 text-center"
        style={{ position: 'absolute', left: 0, right: 0, bottom: '4rem' }}
      >
        <p className="hero-intro-fade-up text-base tracking-wide text-[#f5f5f0] md:text-lg lg:text-xl">
          {renderIntro(intro)}
        </p>
      </div>
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
    </section>
  );
}
