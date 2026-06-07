'use client';

import Image from 'next/image';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
const Lightbox = dynamic(() => import('./Lightbox'), { ssr: false });
import LikeButton from './LikeButton';
import ScrollReveal from './ScrollReveal';

function PhotoCard({
  photo,
  idx,
  onOpen,
}: {
  photo: { src: string; alt: string };
  idx: number;
  onOpen: (originRect?: DOMRect) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [animating, setAnimating] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/likes?type=${encodeURIComponent('photo')}&id=${encodeURIComponent(photo.src)}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setLiked(data.liked ?? false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [photo.src]);

  const doToggleLike = useCallback(async (nextLiked: boolean) => {
    setLiked(nextLiked);
    setCount((prev) => (nextLiked ? prev + 1 : prev - 1));

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'photo', targetId: photo.src }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked((prev) => !prev);
      setCount((prev) => (nextLiked ? prev - 1 : prev + 1));
    }
  }, [photo.src]);

  const handleToggleLike = useCallback(() => {
    const nextLiked = !liked;
    if (nextLiked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    doToggleLike(nextLiked);
  }, [liked, doToggleLike]);

  const handleDoubleClickLike = useCallback(() => {
    if (liked) return; // 双击只点赞，不取消
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
    doToggleLike(true);
  }, [liked, doToggleLike]);

  const handleClick = useCallback(() => {
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        const rect = cardRef.current?.getBoundingClientRect();
        onOpen(rect);
        clickCount.current = 0;
      }, 300);
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = null;
      clickCount.current = 0;
      handleDoubleClickLike();
    }
  }, [onOpen, handleDoubleClickLike]);

  return (
    <div
      ref={cardRef}
      className="relative aspect-square overflow-hidden rounded-lg cursor-pointer select-none"
      onClick={handleClick}
    >
      <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-all duration-500 active:scale-[0.98] active:brightness-110" />

      {/* Double-click heart animation */}
      {showHeart && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            fill="#c9a227"
            className="w-16 h-16 animate-[heartPop_0.8s_ease-out_forwards]"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}

      {/* Like button overlay — bottom-right corner */}
      <div
        className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <LikeButton
          targetType="photo"
          targetId={photo.src}
          className="text-xs"
          liked={liked}
          count={count}
          loaded={loaded}
          onToggle={handleToggleLike}
        />
      </div>
    </div>
  );
}

export default function AlbumPhotoGrid({
  photos,
}: {
  photos: { src: string; alt: string }[];
}) {
  const [lightboxState, setLightboxState] = useState<{ index: number; originRect?: DOMRect } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, idx) => (
          <ScrollReveal key={idx} delay={idx * 60}>
            <PhotoCard
              key={idx}
              photo={photo}
              idx={idx}
              onOpen={(rect) => setLightboxState({ index: idx, originRect: rect })}
            />
          </ScrollReveal>
        ))}
      </div>
      {lightboxState !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
          onIndexChange={(index) => setLightboxState((prev) => prev ? { ...prev, index } : null)}
          originRect={lightboxState.originRect}
        />
      )}
    </>
  );
}
