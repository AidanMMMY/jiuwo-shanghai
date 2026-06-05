'use client';

import { useEffect, useState } from 'react';

export default function OrientLock() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const check = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      const narrow = window.matchMedia('(max-width: 896px)').matches;
      setLocked(landscape && narrow);
    };

    check();

    const mqLandscape = window.matchMedia('(orientation: landscape)');
    const mqNarrow = window.matchMedia('(max-width: 896px)');

    const handler = () => check();
    mqLandscape.addEventListener('change', handler);
    mqNarrow.addEventListener('change', handler);

    return () => {
      mqLandscape.removeEventListener('change', handler);
      mqNarrow.removeEventListener('change', handler);
    };
  }, []);

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0a0a0a] pointer-events-auto"
      style={{ zIndex: 99999 }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center select-none">
        {/* Phone rotate icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: 'orientLockPulse 2.4s ease-in-out infinite' }}
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" stroke="#c9a227" strokeWidth="1.5" />
          <path d="M9 6h6" opacity="0.3" />
          <path d="M9 9h4" opacity="0.15" />
        </svg>

        <div className="flex flex-col items-center gap-3">
          <p className="text-lg tracking-[0.2em] text-[#f5f5f0]">
            Please rotate your device
          </p>
          <p className="text-xs tracking-[0.15em] text-[#c9a227]/60">
            JIUWO is best experienced in portrait mode
          </p>
        </div>
      </div>

      <style>{`
        @keyframes orientLockPulse {
          0%, 100% { opacity: 0.5; transform: rotate(0deg) scale(1); }
          50%      { opacity: 1; transform: rotate(90deg) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
