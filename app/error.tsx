'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 md:px-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-5xl font-bold text-[#c9a227]"
          style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
        >
          Oops
        </h1>
        <p className="text-sm text-[#a0a0a0] tracking-wider">Something went wrong. Please try again.</p>
        <div className="flex gap-4 mt-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 border border-[#c9a227]/50 text-[#c9a227] text-xs tracking-[0.2em] rounded-full hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors"
          >
            RETRY
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 border border-[#333] text-[#a0a0a0] text-xs tracking-[0.2em] rounded-full hover:border-[#c9a227]/50 hover:text-[#c9a227] transition-colors"
          >
            GO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
