'use client';

import Image from 'next/image';
import { useEffect, useCallback, useRef } from 'react';
import LikeButton from './LikeButton';

export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  photos: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;
    if (diff > threshold) {
      onNext();
    } else if (diff < -threshold) {
      onPrev();
    }
    touchStartX.current = null;
  }, [onPrev, onNext]);

  if (currentIndex < 0 || currentIndex >= photos.length) return null;

  const photo = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="absolute top-4 right-4 z-10 p-3 text-[#f5f5f0] text-3xl hover:text-[#c9a227]"
        onClick={onClose}
        aria-label="关闭"
      >
        ×
      </button>

      {photos.length > 1 && (
        <>
          <button
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 p-4 text-[#f5f5f0] text-4xl md:text-5xl hover:text-[#c9a227] select-none"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 p-4 text-[#f5f5f0] text-4xl md:text-5xl hover:text-[#c9a227] select-none"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="下一张"
          >
            ›
          </button>
        </>
      )}

      <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.src} alt={photo.alt} fill className="object-contain" />
      </div>

      <div className="absolute bottom-6 flex items-center gap-4">
        <p className="text-sm text-[#a0a0a0]">
          {currentIndex + 1} / {photos.length}
        </p>
        <LikeButton targetType="photo" targetId={photo.src} />
      </div>
    </div>
  );
}
