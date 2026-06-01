'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export default function ScrollReveal({
  children,
  delay = 0,
  className = '',
  effect = 'fade-up',
  threshold,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  effect?: 'fade-up' | 'fade-in' | 'scale-in' | 'title' | 'text' | 'image' | 'card' | 'data';
  threshold?: number;
}) {
  const defaultThreshold = effect === 'title' || effect === 'image' ? 0.15 : 0.05;
  const { ref, visible } = useScrollReveal(threshold ?? defaultThreshold);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isVisible = visible || reducedMotion;

  // Map effect names to CSS utility classes
  const effectClassMap: Record<string, string> = {
    title: 'reveal-title',
    text: 'reveal-text',
    image: 'reveal-image',
    card: 'reveal-card',
    data: 'reveal-data',
  };

  const isLegacy = ['fade-up', 'fade-in', 'scale-in'].includes(effect);
  const newEffectClass = effectClassMap[effect] || '';

  const getTransform = () => {
    if (reducedMotion || !isLegacy) return 'none';
    switch (effect) {
      case 'fade-up':
        return isVisible ? 'translateY(0)' : 'translateY(24px)';
      case 'scale-in':
        return isVisible ? 'scale(1)' : 'scale(0.96)';
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={ref}
      className={`${isLegacy ? 'transition-all duration-700 ease-out' : ''} ${newEffectClass} ${isVisible && !isLegacy ? 'reveal-visible' : ''} ${className}`}
      style={{
        opacity: isLegacy ? (isVisible ? 1 : 0) : undefined,
        transform: isLegacy ? getTransform() : undefined,
        transitionDelay: reducedMotion ? '0ms' : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
