'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { NavItem } from '@/lib/data';

export default function Navbar({
  name,
  nav,
}: {
  name: string;
  nav: NavItem[];
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-sm' : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors">
          {name}
        </Link>
        <nav className="flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
