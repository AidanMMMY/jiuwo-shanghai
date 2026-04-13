'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
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
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-6xl font-medium tracking-widest text-[#f5f5f0] mb-4">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-[#a0a0a0] tracking-wide">
          {tagline}
        </p>
      </div>
    </section>
  );
}
