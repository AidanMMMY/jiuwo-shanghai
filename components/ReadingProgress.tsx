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
        className="h-full bg-gradient-to-r from-[#c9a227]/60 via-[#c9a227] to-[#c9a227]/60 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
