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

  return (
    <section className="relative h-screen w-full overflow-hidden">
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
          0%, 15% { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
          55%, 100% { -webkit-mask-position: 0% 0; mask-position: 0% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tagline-shimmer { animation: none !important; -webkit-mask-image: none !important; mask-image: none !important; }
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
        style={{ position: 'absolute', left: 0, right: 0, bottom: '3rem' }}
      >
        <p className="text-lg tracking-wide text-[#f5f5f0] md:text-xl lg:text-2xl">
          {intro}
        </p>
      </div>
    </section>
  );
}
