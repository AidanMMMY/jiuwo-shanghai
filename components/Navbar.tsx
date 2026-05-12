'use client';

import Image from 'next/image';
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
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href={isZh ? '/zh' : '/'} className="flex items-center gap-2 text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors shrink-0">
          <div className="relative w-8 h-8">
            <Image src="/images/logo.png" alt="logo" fill className="object-contain" />
          </div>
          <span className="hidden sm:inline">{name}</span>
        </Link>
        <nav className="flex items-center gap-3 md:gap-6 lg:gap-8 overflow-x-auto">
          {nav.map((item) => {
            const localizedHref = isZh
              ? item.href === '/'
                ? '/zh'
                : `/zh${item.href}`
              : item.href;
            return (
              <Link
                key={item.href}
                href={localizedHref}
                className="text-xs md:text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            );
          })}
          <div className="flex items-center gap-1.5 text-xs md:text-sm border-l border-[#333] pl-3 md:pl-6 ml-1 md:ml-2 shrink-0">
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
