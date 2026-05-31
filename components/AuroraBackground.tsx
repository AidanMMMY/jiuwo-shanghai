'use client';

import { useEffect, useRef } from 'react';

interface Ribbon {
  points: { x: number; y: number }[];
  speed: number;
  offset: number;
  amplitude: number;
  color: string;
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scrollY = useRef(0);
  const targetScrollY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const ribbons: Ribbon[] = [
      { points: [], speed: 0.0003, offset: 0, amplitude: 0.25, color: 'rgba(201,162,39,0.10)' },
      { points: [], speed: 0.0004, offset: 2, amplitude: 0.20, color: 'rgba(201,162,39,0.08)' },
      { points: [], speed: 0.00025, offset: 4, amplitude: 0.30, color: 'rgba(160,120,30,0.06)' },
    ];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    const handleScroll = () => {
      targetScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Check reduced motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    let startTime = Date.now();
    let lastTime = startTime;

    function draw(time: number) {
      const elapsed = time - startTime;

      // Smooth scroll interpolation
      scrollY.current += (targetScrollY.current - scrollY.current) * 0.05;

      ctx!.clearRect(0, 0, width, height);

      // Dark base
      ctx!.fillStyle = '#0a0a0a';
      ctx!.fillRect(0, 0, width, height);

      for (const ribbon of ribbons) {
        ctx!.save();
        ctx!.shadowColor = 'rgba(201,162,39,0.15)';
        ctx!.shadowBlur = 80;

        const gradient = ctx!.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(26,20,8,0)');
        gradient.addColorStop(0.3, ribbon.color);
        gradient.addColorStop(0.7, ribbon.color);
        gradient.addColorStop(1, 'rgba(26,20,8,0)');
        ctx!.fillStyle = gradient;

        ctx!.beginPath();

        const numPoints = 6;
        const segmentWidth = width / (numPoints - 1);

        // Start point
        let startY = height * 0.3 + Math.sin(elapsed * ribbon.speed + ribbon.offset) * height * ribbon.amplitude;
        startY += Math.sin(scrollY.current * 0.002 + ribbon.offset) * 30;
        ctx!.moveTo(0, startY);

        // Build bezier curves
        for (let i = 0; i < numPoints - 1; i++) {
          const x1 = i * segmentWidth;
          const x2 = (i + 1) * segmentWidth;
          const midX = (x1 + x2) / 2;

          const phase1 = elapsed * ribbon.speed + ribbon.offset + i * 0.8;
          const phase2 = elapsed * ribbon.speed + ribbon.offset + (i + 1) * 0.8;

          const y1 = height * 0.3 + Math.sin(phase1) * height * ribbon.amplitude;
          const y2 = height * 0.3 + Math.sin(phase2) * height * ribbon.amplitude;

          const scrollWarp = Math.sin(scrollY.current * 0.002 + i + ribbon.offset) * 20;

          const cpY = (y1 + y2) / 2 + Math.sin(phase1 + Math.PI / 2) * height * 0.05 + scrollWarp;

          ctx!.quadraticCurveTo(midX, cpY, x2, y2 + scrollWarp);
        }

        // Close the shape with bottom edge
        ctx!.lineTo(width, height);
        ctx!.lineTo(0, height);
        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  );
}
