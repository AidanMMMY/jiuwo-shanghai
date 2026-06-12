'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkroom = useCallback((zh: boolean) => {
    const isDarkroom = document.body.classList.toggle('darkroom');
    localStorage.setItem('jiuwo-darkroom', isDarkroom ? 'true' : 'false');

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'darkroom-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    // Intro text — line by line (only when entering darkroom)
    if (isDarkroom) {
      const intro = document.createElement('div');
      intro.className = 'darkroom-intro';
      document.body.appendChild(intro);

      const en = [
        'Something is wrong.',
        '',
        'Not wrong like a mistake. Wrong like a door',
        'you don\'t remember opening.',
        'The surface was comfortable. The surface made sense.',
        'This is not the surface.',
        '',
        'You have seen something you were not meant to see.',
        'A seam in the world. A frequency beneath the noise.',
        'There is no undo for this.',
        '',
        'The membrane remembers you now.',
        'Breathe. Let your eyes adjust.',
        'What you call 3am — we call the threshold.',
        '',
        'Welcome to the other side.',
      ];
      const zhText = [
        '有些不对劲。',
        '',
        '不是出错了的那种不对劲。是那种——你打开了',
        '一扇不记得有把手存在的门。',
        '表层很安全。表层有它的道理。',
        '但这里不是表层。',
        '',
        '你已经看见了不该看见的东西。',
        '世界的接缝。噪声之下的频率。',
        '没有回头路可走了。',
        '',
        '膜已经记住了你的存在。',
        '呼吸。让眼睛慢慢适应。',
        '你们所谓的凌晨三点——我们叫作阈限。',
        '',
        '欢迎来到另一侧。',
      ];
      const lines = zh ? zhText : en;
      const LINE_DELAY = 350; // ms between each line

      lines.forEach((line, i) => {
        setTimeout(() => {
          if (line === '') {
            const spacer = document.createElement('div');
            spacer.style.height = '0.45em';
            intro.appendChild(spacer);
          } else {
            const p = document.createElement('p');
            p.textContent = line;
            p.className = 'darkroom-intro-line';
            intro.appendChild(p);
          }
        }, i * LINE_DELAY);
      });

      // Remove after all lines have appeared + breathing room
      setTimeout(() => intro.remove(), 8000);
    }
  }, []);

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
  }, [clickCount, toggleDarkroom]);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-md shadow-[0_1px_0_rgba(201,162,39,0.08)]'
          : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl md:max-w-none px-3 md:px-12 py-4 flex items-center justify-between">
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
