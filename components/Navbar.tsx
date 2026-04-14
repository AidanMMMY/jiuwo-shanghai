'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const otherHref = isZh
    ? pathname === '/zh' || pathname === '/zh/'
      ? '/'
      : pathname.replace(/^\/zh/, '')
    : pathname === '/'
      ? '/zh'
      : `/zh${pathname}`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-sm' : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href={isZh ? '/zh' : '/'} className="text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors">
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
          <div className="flex items-center gap-2 text-sm border-l border-[#333] pl-6 ml-2">
            <Link
              href={otherHref}
              className={`${isZh ? 'text-[#a0a0a0] hover:text-[#c9a227]' : 'text-[#f5f5f0] font-medium'} transition-colors`}
            >
              EN
            </Link>
            <span className="text-[#555]">/</span>
            <Link
              href={otherHref}
              className={`${isZh ? 'text-[#f5f5f0] font-medium' : 'text-[#a0a0a0] hover:text-[#c9a227]'} transition-colors`}
            >
              中
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
