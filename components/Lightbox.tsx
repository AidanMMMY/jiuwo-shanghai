'use client';

import Image from 'next/image';
import { useEffect, useCallback, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import LikeButton from './LikeButton';

function getCenterRect(): DOMRect {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w * 0.9, h * 0.8);
  return new DOMRect(
    (w - size) / 2,
    (h - size * 0.8) / 2,
    size,
    size * 0.8
  );
}

function animateFlip(
  fromRect: DOMRect,
  toRect: DOMRect,
  element: HTMLElement,
  duration: number = 400
): Animation {
  const scaleX = fromRect.width / toRect.width;
  const scaleY = fromRect.height / toRect.height;
  const translateX = fromRect.left - toRect.left + (fromRect.width - toRect.width) / 2;
  const translateY = fromRect.top - toRect.top + (fromRect.height - toRect.height) / 2;

  return element.animate(
    [
      { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, opacity: 1 },
      { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
    ],
    { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
  );
}

export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
  originRect,
}: {
  photos: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  originRect?: DOMRect;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: currentIndex,
    loop: true,
  });

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [showContent, setShowContent] = useState(!originRect);
  const flyingRef = useRef<HTMLImageElement>(null);
  const [bgOpacity, setBgOpacity] = useState(originRect ? 0 : 1);

  // Background fade-in
  useEffect(() => {
    if (originRect) {
      requestAnimationFrame(() => setBgOpacity(1));
    }
  }, [originRect]);

  // FLIP open animation
  useEffect(() => {
    if (!originRect || !flyingRef.current) {
      setShowContent(true);
      return;
    }
    const targetRect = getCenterRect();
    const anim = animateFlip(originRect, targetRect, flyingRef.current, 400);
    anim.onfinish = () => setShowContent(true);
    return () => anim.cancel();
  }, [originRect]);

  // Sync embla selection to parent
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    onIndexChange(index);
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Sync parent currentIndex to embla (when keyboard nav triggers)
  useEffect(() => {
    if (!emblaApi || emblaApi.selectedScrollSnap() === currentIndex) return;
    emblaApi.scrollTo(currentIndex);
  }, [emblaApi, currentIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    },
    [onClose, emblaApi]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const photo = photos[selectedIndex];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col transition-colors duration-300"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity * 0.95})` }}
      onClick={showContent ? onClose : undefined}
    >
      {/* Flying image */}
      {!showContent && originRect && (
        <img
          ref={flyingRef}
          src={photos[currentIndex].src}
          alt={photos[currentIndex].alt}
          className="fixed z-[101] object-contain"
          style={{
            left: originRect.left,
            top: originRect.top,
            width: originRect.width,
            height: originRect.height,
          }}
        />
      )}

      {/* Content - only show after animation */}
      <div className={`flex-1 flex flex-col ${showContent ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
        {/* Close button */}
        <button
          className="absolute top-4 right-4 z-10 p-3 text-[#f5f5f0] text-3xl hover:text-[#c9a227]"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="关闭"
        >
          ×
        </button>

        {/* Carousel */}
        <div
          ref={emblaRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full">
            {photos.map((p, i) => (
              <div
                key={`${p.src}-${i}`}
                className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center px-4"
              >
                <div className="relative w-full h-[80vh]">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    className="object-contain"
                    priority={i === selectedIndex}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next buttons (desktop) */}
        {photos.length > 1 && (
          <>
            <button
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 p-4 text-[#f5f5f0] text-4xl hover:text-[#c9a227] select-none items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                emblaApi?.scrollPrev();
              }}
              aria-label="上一张"
            >
              ‹
            </button>
            <button
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 p-4 text-[#f5f5f0] text-4xl hover:text-[#c9a227] select-none items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                emblaApi?.scrollNext();
              }}
              aria-label="下一张"
            >
              ›
            </button>
          </>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-center gap-4 py-4">
          <p className="text-sm text-[#a0a0a0]">
            {selectedIndex + 1} / {photos.length}
          </p>
          <LikeButton targetType="photo" targetId={photo.src} />
        </div>
      </div>
    </div>
  );
}
