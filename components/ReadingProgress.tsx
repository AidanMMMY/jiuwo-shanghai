'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const isArticlePage = pathname?.includes('/updates/');

  useEffect(() => {
    if (!isArticlePage) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(pct, 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isArticlePage]);

  if (!isArticlePage) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent">
      <div
        className="h-full relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/60 via-[#c9a227] to-[#c9a227]/60" />
        {/* Glow spot at the leading edge */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1 h-3 rounded-full"
          style={{
            background: 'rgba(201,162,39,0.8)',
            boxShadow: '0 0 6px rgba(201,162,39,0.6), 0 0 12px rgba(201,162,39,0.3)',
          }}
        />
      </div>
    </div>
  );
}
