'use client';

import Image from 'next/image';
import { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import LikeButton from './LikeButton';

export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
}: {
  photos: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: currentIndex,
    loop: true,
  });

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);

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
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
    >
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
  );
}
