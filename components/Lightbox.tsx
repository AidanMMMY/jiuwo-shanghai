'use client';

import Image from 'next/image';
import { useEffect, useCallback, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, useMotionValue } from 'framer-motion';
import LikeButton from './LikeButton';

/* ─────────────────────────────────────────────
   FLIP open animation helpers
   ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Zoom overlay — pinch / double-tap / pan
   ───────────────────────────────────────────── */

function dist(t1: React.Touch, t2: React.Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

interface ZoomState {
  src: string;
  alt: string;
}

function ZoomOverlay({
  zoom,
  onClose,
}: {
  zoom: ZoomState;
  onClose: () => void;
}) {
  const scale = useMotionValue(1);
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  // ── gesture refs ──
  const pinchStart = useRef({ dist: 0, scale: 1, posX: 0, posY: 0, midX: 0, midY: 0 });
  const panRef = useRef({ active: false, lastX: 0, lastY: 0, posX: 0, posY: 0 });
  const lastTap = useRef(0);

  const reset = useCallback(() => {
    scale.set(1);
    posX.set(0);
    posY.set(0);
  }, [scale, posX, posY]);

  const snapToScale = useCallback(
    (target: number, originX: number, originY: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // zoom toward tap origin
      const tx = (w / 2 - originX) * (target - 1);
      const ty = (h / 2 - originY) * (target - 1);
      scale.set(target);
      posX.set(tx);
      posY.set(ty);
    },
    [scale, posX, posY]
  );

  /* ── touch handlers ── */
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const currentScale = scale.get();
      const currentPosX = posX.get();
      const currentPosY = posY.get();

      if (e.touches.length >= 2) {
        pinchStart.current = {
          dist: dist(e.touches[0], e.touches[1]),
          scale: currentScale,
          posX: currentPosX,
          posY: currentPosY,
          midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      } else if (e.touches.length === 1) {
        // double-tap detection
        const now = Date.now();
        if (now - lastTap.current < 300) {
          if (currentScale > 1.05) {
            reset();
          } else {
            snapToScale(2.5, e.touches[0].clientX, e.touches[0].clientY);
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        // pan start (only when zoomed)
        if (currentScale > 1.05) {
          panRef.current = {
            active: true,
            lastX: e.touches[0].clientX,
            lastY: e.touches[0].clientY,
            posX: currentPosX,
            posY: currentPosY,
          };
        }
      }
    },
    [scale, posX, posY, reset, snapToScale]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // pinch
      if (e.touches.length >= 2 && pinchStart.current.dist > 0) {
        const newDist = dist(e.touches[0], e.touches[1]);
        const ratio = newDist / pinchStart.current.dist;
        const newScale = Math.max(1, Math.min(4, pinchStart.current.scale * ratio));

        const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dmx = newMidX - pinchStart.current.midX;
        const dmy = newMidY - pinchStart.current.midY;

        scale.set(newScale);
        posX.set(pinchStart.current.posX + dmx);
        posY.set(pinchStart.current.posY + dmy);
        return;
      }

      // pan
      if (panRef.current.active && e.touches.length === 1) {
        const dx = e.touches[0].clientX - panRef.current.lastX;
        const dy = e.touches[0].clientY - panRef.current.lastY;
        posX.set(panRef.current.posX + dx);
        posY.set(panRef.current.posY + dy);
        return;
      }
    },
    [scale, posX, posY]
  );

  const onTouchEnd = useCallback(() => {
    pinchStart.current.dist = 0;
    panRef.current.active = false;

    // snap back if below threshold
    const s = scale.get();
    if (s < 1.05) {
      reset();
    }
  }, [scale, reset]);

  // click on backdrop → close zoom (if not zoomed in)
  // ignore clicks within 400ms of mount to avoid the double-tap click that opened us
  const mountedAt = useRef(Date.now());
  const handleBackdropClick = useCallback(() => {
    if (Date.now() - mountedAt.current < 400) return;
    if (scale.get() < 1.1) {
      onClose();
    }
  }, [scale, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[110] bg-black/98"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleBackdropClick}
    >
      <motion.div
        className="absolute inset-0 touch-none"
        style={{
          scale,
          x: posX,
          y: posY,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={zoom.src}
          alt={zoom.alt}
          fill
          sizes="100vw"
          className="object-contain"
          priority
          draggable={false}
        />
      </motion.div>

      {/* Close button */}
      <button
        className="absolute top-[4.5rem] right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="关闭"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l14 14M15 1L1 15" />
        </svg>
      </button>

      {/* Hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-xs text-[#a0a0a0]/50 pointer-events-none select-none">
        双击或捏合缩放 · 下滑关闭
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Lightbox
   ───────────────────────────────────────────── */

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

  // Zoom state
  const [zoom, setZoom] = useState<ZoomState | null>(null);

  // Swipe-to-dismiss state
  const dismissY = useMotionValue(0);
  const dismissOpacity = useMotionValue(1);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const [dismissing, setDismissing] = useState(false);

  // First-time hint
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('lightbox-hint-shown');
  });

  useEffect(() => {
    if (showSwipeHint && showContent) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('lightbox-hint-shown', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, showContent]);

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

  // On zoom change → enable/disable Embla drag
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ watchDrag: !zoom });
  }, [emblaApi, zoom]);

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

  // Sync parent currentIndex to embla
  useEffect(() => {
    if (!emblaApi || emblaApi.selectedScrollSnap() === currentIndex) return;
    emblaApi.scrollTo(currentIndex);
  }, [emblaApi, currentIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoom) { setZoom(null); return; }
        onClose();
      }
      if (zoom) return; // no carousel nav when zoomed
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    },
    [onClose, emblaApi, zoom]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  /* ── swipe-to-dismiss touch handlers ── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom || e.touches.length !== 1) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setDismissing(true);
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (zoom || !dismissing || e.touches.length !== 1) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      dismissY.set(delta * 0.6);
      dismissOpacity.set(Math.max(0.2, 1 - delta / 600));
    }
  }, [zoom, dismissing, dismissY, dismissOpacity]);

  const handleTouchEnd = useCallback(() => {
    if (zoom || !dismissing) return;
    setDismissing(false);
    const delta = dismissY.get();
    const duration = Date.now() - touchStartTime.current;
    const velocity = delta / (duration || 1);

    if (delta > 100 || velocity > 0.5) {
      onClose();
    } else {
      dismissY.set(0);
      dismissOpacity.set(1);
    }
  }, [zoom, dismissing, dismissY, dismissOpacity, onClose]);

  /* ── double-tap on carousel image → enter zoom ── */
  const lastSlideTap = useRef(0);
  const handleSlideDoubleTap = useCallback(
    (e: React.TouchEvent, photo: { src: string; alt: string }) => {
      const now = Date.now();
      if (now - lastSlideTap.current < 300) {
        e.preventDefault(); // suppress synthesized click
        setZoom({ src: photo.src, alt: photo.alt });
        lastSlideTap.current = 0;
        return;
      }
      lastSlideTap.current = now;
    },
    []
  );

  const photo = photos[selectedIndex];
  if (!photo) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity * 0.95})` }}
      animate={{ backgroundColor: `rgba(0,0,0,${bgOpacity * 0.95})` }}
      transition={{ duration: 0.3 }}
      onClick={showContent && !zoom ? onClose : undefined}
    >
      {/* Flying image (FLIP) */}
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

      {/* Main content */}
      <motion.div
        className="flex-1 flex flex-col min-h-0"
        style={{
          y: dismissY,
          opacity: dismissOpacity,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`flex-1 flex flex-col min-h-0 ${showContent ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
          {/* Close button */}
          <button
            className="absolute top-[4.5rem] right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l14 14M15 1L1 15" />
            </svg>
          </button>

          {/* Carousel */}
          <div
            ref={emblaRef}
            className="flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            style={{ overflow: zoom ? 'visible' : 'hidden' }}
          >
            <div className="flex h-full">
              {photos.map((p, i) => (
                <div
                  key={`${p.src}-${i}`}
                  className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center px-4"
                  onTouchStart={(e) => handleSlideDoubleTap(e, p)}
                >
                  <div className="relative w-full h-[75vh] md:h-[82vh]">
                    <Image
                      src={p.src}
                      alt={p.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 80vw"
                      className="object-contain"
                      priority={Math.abs(i - selectedIndex) <= 1}
                      draggable={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prev / Next buttons (desktop) */}
          {photos.length > 1 && !zoom && (
            <>
              <button
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  emblaApi?.scrollPrev();
                }}
                aria-label="上一张"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2L4 8l6 6" />
                </svg>
              </button>
              <button
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  emblaApi?.scrollNext();
                }}
                aria-label="下一张"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2l6 6-6 6" />
                </svg>
              </button>
            </>
          )}

          {/* Swipe hint */}
          {showSwipeHint && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-xs text-[#a0a0a0]/60 pointer-events-none select-none">
              滑动切换照片 · 下滑关闭
            </div>
          )}

          {/* Bottom bar */}
          {!zoom && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-full bg-black/40 backdrop-blur-md px-5 py-2">
              <p className="text-xs text-[#a0a0a0] tabular-nums">
                {selectedIndex + 1} / {photos.length}
              </p>
              <LikeButton targetType="photo" targetId={photo.src} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Zoom overlay */}
      {zoom && (
        <ZoomOverlay
          zoom={zoom}
          onClose={() => setZoom(null)}
        />
      )}
    </motion.div>
  );
}
