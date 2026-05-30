'use client';

import { useState, useCallback, useEffect } from 'react';

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

export default function LikeButton({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: string;
}) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    fetch(`/api/likes?type=${encodeURIComponent(targetType)}&id=${encodeURIComponent(targetId)}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setLiked(data.liked ?? false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [targetType, targetId]);

  const handleLike = useCallback(async () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((prev) => (nextLiked ? prev + 1 : prev - 1));

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (!res.ok) throw new Error('Failed to toggle like');

      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked((prev) => !prev);
      setCount((prev) => (liked ? prev + 1 : prev - 1));
    }
  }, [targetType, targetId, liked]);

  const handleDoubleClick = useCallback(() => {
    if (!liked) {
      handleLike();
    }
  }, [liked, handleLike]);

  return (
    <button
      onClick={handleLike}
      onDoubleClick={handleDoubleClick}
      className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
        liked ? 'text-[#c9a227]' : 'text-[#a0a0a0] hover:text-[#c9a227]'
      }`}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <HeartIcon
        filled={liked}
        className={`transition-transform ${animating ? 'scale-125' : 'scale-100'}`}
      />
      <span className="tabular-nums">{loaded ? count : '—'}</span>
    </button>
  );
}
