'use client';

import { useState } from 'react';

export default function MapEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        className="w-full aspect-video rounded-lg border border-[#c9a22733] bg-[#111] flex flex-col items-center justify-center gap-3 hover:border-[#c9a22766] hover:bg-[#181818] transition-all duration-300 cursor-pointer group"
        aria-label="Load map"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50 group-hover:opacity-100 transition-opacity"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span className="text-xs tracking-[0.2em] text-[#a0a0a0] group-hover:text-[#c9a227] transition-colors">
          VIEW MAP
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden border border-[#c9a22733]">
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
    </div>
  );
}
