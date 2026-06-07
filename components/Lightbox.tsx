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

function dist(t1: React.Touch, t2: React.Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ─────────────────────────────────────────────
   Main Lightbox — carousel + pinch-zoom unified
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
    loop: photos.length >= 3,
  });

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [emblaReady, setEmblaReady] = useState(false);
  const [showContent, setShowContent] = useState(!originRect);
  const flyingRef = useRef<HTMLImageElement>(null);
  const [bgOpacity, setBgOpacity] = useState(originRect ? 0 : 1);

  // ── unified zoom state (applied to active slide only) ──
  const scale = useMotionValue(1);
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // ── gesture refs ──
  const pinchStart = useRef({ dist: 0, scale: 1, x: 0, y: 0, midX: 0, midY: 0 });
  const panRef = useRef({ active: false, lastX: 0, lastY: 0, x: 0, y: 0 });
  const lastTap = useRef(0);

  // ── swipe-to-dismiss ──
  const dismissY = useMotionValue(0);
  const dismissOpacity = useMotionValue(1);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const [dismissing, setDismissing] = useState(false);

  // ── reset zoom when slide changes ──
  useEffect(() => {
    scale.set(1);
    posX.set(0);
    posY.set(0);
    setIsZoomed(false);
    emblaApi?.reInit({ watchDrag: true });
  }, [selectedIndex, scale, posX, emblaApi]);

  // ── embla initialization guard ──
  useEffect(() => {
    if (!emblaApi) return;
    // 延迟标记 ready，确保 loop 模式的 clone slides 初始化完成
    const timer = setTimeout(() => setEmblaReady(true), 400);
    return () => clearTimeout(timer);
  }, [emblaApi]);

  // ── first-time hint ──
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

  // ── background fade-in ──
  useEffect(() => {
    if (originRect) {
      requestAnimationFrame(() => setBgOpacity(1));
    }
  }, [originRect]);

  // ── FLIP open animation ──
  useEffect(() => {
    if (!originRect || !flyingRef.current) {
      setShowContent(true);
      return;
    }
    const targetRect = getCenterRect();
    const anim = animateFlip(originRect, targetRect, flyingRef.current, 400);
    anim.onfinish = () => setShowContent(true);
    // 兜底：如果动画 onfinish 因任何原因没触发，600ms 后强制显示内容
    const fallback = setTimeout(() => setShowContent(true), 600);
    return () => { anim.cancel(); clearTimeout(fallback); };
  }, [originRect]);

  // ── sync embla → parent (only after initialization) ──
  const onSelect = useCallback(() => {
    if (!emblaApi || !emblaReady) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    onIndexChange(index);
  }, [emblaApi, emblaReady, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // ── sync parent currentIndex → embla (only after initialization) ──
  useEffect(() => {
    if (!emblaApi || !emblaReady || emblaApi.selectedScrollSnap() === currentIndex) return;
    emblaApi.scrollTo(currentIndex);
  }, [emblaApi, emblaReady, currentIndex]);

  // ── keyboard ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          scale.set(1); posX.set(0); posY.set(0); setIsZoomed(false);
          emblaApi?.reInit({ watchDrag: true });
          return;
        }
        onClose();
      }
      if (isZoomed) return;
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    },
    [onClose, emblaApi, isZoomed, scale, posX]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── prevent body scroll ──
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  /* ──────────────────────────────────────────
     Slide touch handlers (pinch / double-tap / pan)
     ────────────────────────────────────────── */

  const handleSlideTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const s = scale.get();
      const x = posX.get();
      const y = posY.get();

      if (e.touches.length >= 2) {
        // pinch start
        pinchStart.current = {
          dist: dist(e.touches[0], e.touches[1]),
          scale: s,
          x,
          y,
          midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        emblaApi?.reInit({ watchDrag: false });
        return;
      }

      if (e.touches.length === 1) {
        // double-tap detection
        const now = Date.now();
        if (now - lastTap.current < 300) {
          e.preventDefault();
          if (s > 1.05) {
            // zoom out
            scale.set(1); posX.set(0); posY.set(0); setIsZoomed(false);
            emblaApi?.reInit({ watchDrag: true });
          } else {
            // zoom in toward tap
            const target = 2.5;
            const w = window.innerWidth;
            const h = window.innerHeight;
            scale.set(target);
            posX.set((w / 2 - e.touches[0].clientX) * (target - 1));
            posY.set((h / 2 - e.touches[0].clientY) * (target - 1));
            setIsZoomed(true);
            emblaApi?.reInit({ watchDrag: false });
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;

        // pan start (only when zoomed)
        if (s > 1.05) {
          panRef.current = {
            active: true,
            lastX: e.touches[0].clientX,
            lastY: e.touches[0].clientY,
            x,
            y,
          };
          emblaApi?.reInit({ watchDrag: false });
        }
      }
    },
    [scale, posX, posY, emblaApi]
  );

  const handleSlideTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // pinch
      if (e.touches.length >= 2 && pinchStart.current.dist > 0) {
        const newDist = dist(e.touches[0], e.touches[1]);
        const ratio = newDist / pinchStart.current.dist;
        const newScale = Math.max(1, Math.min(4, pinchStart.current.scale * ratio));

        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        scale.set(newScale);
        posX.set(pinchStart.current.x + (mx - pinchStart.current.midX));
        posY.set(pinchStart.current.y + (my - pinchStart.current.midY));

        if (newScale > 1.05 && !isZoomed) setIsZoomed(true);
        return;
      }

      // pan
      if (panRef.current.active && e.touches.length === 1) {
        const dx = e.touches[0].clientX - panRef.current.lastX;
        const dy = e.touches[0].clientY - panRef.current.lastY;
        posX.set(panRef.current.x + dx);
        posY.set(panRef.current.y + dy);
        return;
      }
    },
    [scale, posX, posY, isZoomed]
  );

  const handleSlideTouchEnd = useCallback(() => {
    pinchStart.current.dist = 0;
    panRef.current.active = false;

    const s = scale.get();
    if (s < 1.05) {
      scale.set(1); posX.set(0); posY.set(0);
      setIsZoomed(false);
      emblaApi?.reInit({ watchDrag: true });
    }
  }, [scale, posX, posY, emblaApi]);

  /* ──────────────────────────────────────────
     Swipe-to-dismiss (only when not zoomed)
     ────────────────────────────────────────── */

  const handleDismissStart = useCallback((e: React.TouchEvent) => {
    if (isZoomed || e.touches.length !== 1) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setDismissing(true);
  }, [isZoomed]);

  const handleDismissMove = useCallback((e: React.TouchEvent) => {
    if (isZoomed || !dismissing || e.touches.length !== 1) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      dismissY.set(delta * 0.6);
      dismissOpacity.set(Math.max(0.2, 1 - delta / 600));
    }
  }, [isZoomed, dismissing, dismissY, dismissOpacity]);

  const handleDismissEnd = useCallback(() => {
    if (isZoomed || !dismissing) return;
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
  }, [isZoomed, dismissing, dismissY, dismissOpacity, onClose]);

  /* ──────────────────────────────────────────
     Render
     ────────────────────────────────────────── */

  const photo = photos[selectedIndex];
  if (!photo) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity * 0.95})` }}
      animate={{ backgroundColor: `rgba(0,0,0,${bgOpacity * 0.95})` }}
      transition={{ duration: 0.3 }}
      onClick={showContent && !isZoomed ? onClose : undefined}
    >
      {/* FLIP flying image */}
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

      {/* Dismiss wrapper */}
      <motion.div
        className="flex-1 flex flex-col min-h-0"
        style={{ y: dismissY, opacity: dismissOpacity }}
        onTouchStart={handleDismissStart}
        onTouchMove={handleDismissMove}
        onTouchEnd={handleDismissEnd}
      >
        <div className={`flex-1 flex flex-col min-h-0 ${showContent ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
          {/* Close button */}
          <button
            className="absolute top-[4.5rem] right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l14 14M15 1L1 15" />
            </svg>
          </button>

          {/* Carousel */}
          <div
            ref={emblaRef}
            className="flex-1 min-h-0 cursor-grab active:cursor-grabbing"
            style={{ overflow: isZoomed ? 'visible' : 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full">
              {photos.map((p, i) => {
                const isActive = i === selectedIndex;
                return (
                  <div
                    key={`${p.src}-${i}`}
                    className="flex-[0_0_100%] min-w-0 h-full"
                    style={{ visibility: isZoomed && !isActive ? 'hidden' : 'visible' }}
                    onTouchStart={isActive ? handleSlideTouchStart : undefined}
                    onTouchMove={isActive ? handleSlideTouchMove : undefined}
                    onTouchEnd={isActive ? handleSlideTouchEnd : undefined}
                  >
                    <motion.div
                      className="w-full h-full"
                      style={isActive ? { scale, x: posX, y: posY } : undefined}
                    >
                      <Image
                        src={p.src}
                        alt={p.alt}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority={Math.abs(i - selectedIndex) <= 1}
                        draggable={false}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prev / Next buttons (desktop, hidden when zoomed) */}
          {photos.length > 1 && !isZoomed && (
            <>
              <button
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
                aria-label="上一张"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2L4 8l6 6" />
                </svg>
              </button>
              <button
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
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
              滑动切换照片 · 双指缩放 · 下滑关闭
            </div>
          )}

          {/* Bottom bar (hidden when zoomed) */}
          {!isZoomed && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-full bg-black/40 backdrop-blur-md px-5 py-2">
              <p className="text-xs text-[#a0a0a0] tabular-nums">
                {selectedIndex + 1} / {photos.length}
              </p>
              <LikeButton targetType="photo" targetId={photo.src} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
