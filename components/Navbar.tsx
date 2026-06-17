'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { NavItem } from '@/lib/data';

export default function Navbar({
  name,
  nav,
}: {
  name: string;
  nav: NavItem[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [logoPulse, setLogoPulse] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');
  const isPortal =
    pathname === '/darkroom/portal' || pathname === '/zh/darkroom/portal';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const router = useRouter();

  const toggleDarkroom = useCallback((zh: boolean) => {
    const isDarkroom = !document.body.classList.contains('darkroom');

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'darkroom-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    if (isDarkroom) {
      // Entering dark side: flip the current page to dark mode under the flash,
      // then navigate to the portal so the user never sees the normal homepage.
      document.body.classList.add('darkroom');
      localStorage.setItem('jiuwo-darkroom', 'true');
      router.push(zh ? '/zh/darkroom/portal' : '/darkroom/portal');
    } else {
      // Exiting dark side: remove class and go home
      document.body.classList.remove('darkroom');
      localStorage.setItem('jiuwo-darkroom', 'false');
      router.push(zh ? '/zh' : '/');
    }
  }, [router]);

  const handleLogoClick = useCallback(() => {
    setLogoPulse(true);
    setTimeout(() => setLogoPulse(false), 100);

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (newCount >= 5) {
      setClickCount(0);
      toggleDarkroom(isZh);
    } else {
      clickTimerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 1000);
    }
  }, [clickCount, toggleDarkroom, isZh]);

  useEffect(() => {
    // Restore darkroom state on mount
    const saved = localStorage.getItem('jiuwo-darkroom');
    if (saved === 'true') {
      document.body.classList.add('darkroom');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
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
      className={`site-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-md shadow-[0_1px_0_rgba(201,162,39,0.08)]'
          : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl md:max-w-none px-3 md:px-12 py-4 flex items-center justify-between">
        {isPortal ? (
          <div
            className="flex items-center gap-2.5 text-lg font-medium tracking-wide text-[#f5f5f0] shrink-0 invisible"
            aria-hidden="true"
          >
            <div className="relative w-8 h-8" />
            <span className="hidden sm:inline">{name}</span>
          </div>
        ) : (
          <Link
            href={isZh ? '/zh' : '/'}
            className="flex items-center gap-2.5 text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors duration-300 shrink-0 group"
            onClick={(e) => {
              // Only trigger counter on homepage
              if (pathname === '/' || pathname === '/zh') {
                e.preventDefault();
                handleLogoClick();
              }
            }}
          >
            <div className="relative w-8 h-8">
              <Image
                src="/images/logo.png"
                alt="logo"
                fill
                sizes="32px"
                className={`object-contain transition-transform duration-100 ${logoPulse ? 'scale-110' : 'scale-100'}`}
              />
            </div>
            <span className="hidden sm:inline">{name}</span>
          </Link>
        )}
        <nav className="flex items-center gap-3 md:gap-6 lg:gap-8 overflow-x-auto">
          {nav.map((item) => {
            const localizedHref = isZh
              ? item.href === '/'
                ? '/zh'
                : `/zh${item.href}`
              : item.href;
            const normalizedPath = pathname.replace(/^\/zh/, '') || '/';
            const isActive =
              item.href === normalizedPath ||
              (item.href !== '/' && normalizedPath.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={localizedHref}
                className={`relative text-xs md:text-sm transition-colors duration-300 whitespace-nowrap py-1 text-glow-gold ${
                  isActive
                    ? 'text-[#c9a227] font-medium'
                    : 'text-[#a0a0a0] hover:text-[#c9a227]'
                } group`}
              >
                {item.label}
                {/* Active indicator: gold underline */}
                <span
                  className={`absolute -bottom-0.5 left-0 h-px bg-[#c9a227] transition-all duration-300 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            );
          })}
          {/* Language switcher */}
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
