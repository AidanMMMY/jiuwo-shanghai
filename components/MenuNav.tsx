'use client';

import { useEffect, useState } from 'react';
import type { MenuCategory } from '@/lib/data';

export default function MenuNav({ categories }: { categories: MenuCategory[] }) {
  const [active, setActive] = useState<string | null>(categories[0]?.category ?? null);

  useEffect(() => {
    if (categories.length === 0) return;
    const sections = categories
      .map((cat) => document.getElementById(cat.category))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topmost = [...visible.entries()].reduce((a, b) => (a[1] < b[1] ? a : b))[0];
          setActive(topmost);
        }
      },
      { rootMargin: '-128px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div
          className="flex gap-6 overflow-x-auto"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          {categories.map((cat) => (
            <a
              key={cat.category}
              href={`#${cat.category}`}
              className="group relative whitespace-nowrap text-sm transition-colors py-1"
            >
              <span
                className={`transition-colors ${
                  active === cat.category ? 'text-[#c9a227]' : 'text-[#a0a0a0] group-hover:text-[#c9a227]'
                }`}
              >
                {cat.category}
              </span>
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#c9a227] transition-transform duration-300 ease-out origin-center ${
                  active === cat.category ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
              />
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
