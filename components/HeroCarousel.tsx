'use client';

import Image from 'next/image';
import type { HeroSlide } from '@/lib/data';

export default function HeroCarousel({
  slides,
  title,
  tagline,
}: {
  slides: HeroSlide[];
  title: string;
  tagline: string;
}) {
  const duration = slides.length * 5;
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
            animationDelay: `${-index * 5}s`,
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
      `}</style>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-widest text-[#f5f5f0] mb-6">
          {title}
        </h1>
        <p className="text-xl md:text-2xl lg:text-3xl text-[#a0a0a0] tracking-wide">
          {tagline}
        </p>
      </div>
    </section>
  );
}
