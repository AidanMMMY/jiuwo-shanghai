'use client';

import type { MenuCategory } from '@/lib/data';

export default function MenuNav({ categories }: { categories: MenuCategory[] }) {
  return (
    <nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
      <div className="mx-auto max-w-7xl px-6 flex gap-6 overflow-x-auto">
        {categories.map((cat) => (
          <a
            key={cat.category}
            href={`#${cat.category}`}
            className="whitespace-nowrap text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
          >
            {cat.category}
          </a>
        ))}
      </div>
    </nav>
  );
}
