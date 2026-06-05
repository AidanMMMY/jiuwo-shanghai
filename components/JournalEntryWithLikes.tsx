'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import LikeButton from './LikeButton';

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      width="20"
      height="20"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function JournalEntryWithLikes({
  entry,
}: {
  entry: {
    slug: string;
    date: string;
    title: string;
    cover: string;
    coverAspect?: 'wide' | 'square' | 'tall';
    contentHtml: string;
  };
}) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  useEffect(() => {
    fetch(`/api/likes?type=${encodeURIComponent('journal')}&id=${encodeURIComponent(entry.slug)}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setLiked(data.liked ?? false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [entry.slug]);

  const doLike = useCallback(async () => {
    if (liked) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    setLiked(true);
    setCount((prev) => prev + 1);

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'journal', targetId: entry.slug }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(false);
      setCount((prev) => prev - 1);
    }
  }, [entry.slug, liked]);

  const handleClick = useCallback(() => {
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 300);
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      doLike();
    }
  }, [doLike]);

  return (
    <article
      className="relative select-none group"
      onClick={handleClick}
    >
      {/* Double-click heart animation overlay */}
      {showHeart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            fill="#c9a227"
            className="w-24 h-24 animate-[heartPop_0.8s_ease-out_forwards]"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}

      {/* Date with gold accent line */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-4 bg-[#c9a227] rounded-full" />
        <time className="text-xs uppercase tracking-[0.2em] text-[#a0a0a0]">{entry.date}</time>
      </div>

      <h3 className="text-2xl font-medium text-[#a0a0a0] mb-6 tracking-wide leading-snug">{entry.title}</h3>

      {/* Cover image with hover zoom */}
      <div className="flex justify-center mb-8">
        <div className={`relative overflow-hidden rounded-lg ${entry.coverAspect === 'tall' ? 'inline-block' : 'w-full'}`}>
          <Image
            src={entry.cover}
            alt={entry.title}
            width={0}
            height={0}
            sizes="100vw"
            className={
              entry.coverAspect === 'tall'
                ? 'max-w-full max-h-[66vh] w-auto h-auto rounded-lg object-contain block transition-transform duration-500 ease-out group-hover:scale-[1.02]'
                : entry.coverAspect === 'square'
                  ? 'aspect-square object-cover block transition-transform duration-500 ease-out group-hover:scale-[1.02]'
                  : 'w-full h-auto rounded-lg block transition-transform duration-500 ease-out group-hover:scale-[1.02]'
            }
            style={entry.coverAspect === 'square' ? { objectPosition: '40% center' } : undefined}
          />
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setAnimating(true);
              setTimeout(() => setAnimating(false), 300);
              const nextLiked = !liked;
              setLiked(nextLiked);
              setCount((prev) => (nextLiked ? prev + 1 : prev - 1));
              try {
                const res = await fetch('/api/likes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ targetType: 'journal', targetId: entry.slug }),
                });
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setLiked(data.liked);
                setCount(data.count);
              } catch {
                setLiked((prev) => !prev);
                setCount((prev) => (liked ? prev + 1 : prev - 1));
              }
            }}
            className={`absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1.5 text-xs transition-all hover:bg-black/60 ${
              liked ? 'text-[#c9a227]' : 'text-white/80'
            }`}
          >
            <HeartIcon
              filled={liked}
              className={`w-3.5 h-3.5 transition-transform ${animating ? 'scale-125' : 'scale-100'}`}
            />
            <span className="tabular-nums">{loaded ? count : '—'}</span>
          </button>
        </div>
      </div>

      <div
        className="prose prose-invert prose-stone max-w-none prose-headings:text-[#f5f5f0] prose-p:text-[#a0a0a0] prose-a:text-[#c9a227] [&_img]:block [&_img]:mx-auto [&_img]:my-6 [&_img]:max-w-full [&_img]:max-h-[66vh] [&_img]:h-auto [&_img]:rounded-lg"
        dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
      />

      {/* Fading divider */}
      <div className="mt-14 h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
    </article>
  );
}
