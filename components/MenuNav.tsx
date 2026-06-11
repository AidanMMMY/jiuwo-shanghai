'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuCategory } from '@/lib/data';

export default function MenuNav({ categories }: { categories: MenuCategory[] }) {
  const [active, setActive] = useState<string | null>(categories[0]?.category ?? null);
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback(() => {
    if (!navRef.current || !active) return;
    const activeEl = navRef.current.querySelector(`[data-category="${active}"]`) as HTMLElement;
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1,
      });
    }
  }, [active]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

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
      {/* Hide scrollbar for the scroll container */}
      <style>{`.menu-nav-hide-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div className="mx-auto px-4 md:px-12">
        <div
          ref={navRef}
          className="menu-nav-hide-scroll relative flex gap-6 overflow-x-auto px-2"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Sliding indicator */}
          <span
            className="absolute bottom-0 h-0.5 rounded-full bg-[#c9a227] transition-all duration-500 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              opacity: indicatorStyle.opacity,
              boxShadow: '0 2px 8px rgba(201,162,39,0.4)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
          {categories.map((cat) => (
            <a
              key={cat.category}
              href={`#${cat.category}`}
              data-category={cat.category}
              className="group relative flex-shrink-0 whitespace-nowrap text-sm transition-colors py-1 px-1"
            >
              <span
                className={`transition-colors ${
                  active === cat.category ? 'text-[#c9a227]' : 'text-[#a0a0a0] group-hover:text-[#c9a227]'
                }`}
              >
                {cat.category}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
