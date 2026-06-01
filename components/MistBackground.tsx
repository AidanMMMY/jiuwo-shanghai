'use client';

import { useEffect, useRef } from 'react';

// ── Noise ───────────────────────────────────────────────────────

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = smooth(fx);
  const v = smooth(fy);
  return (
    hash(ix + iy * 374761) * (1 - u) * (1 - v) +
    hash(ix + 1 + iy * 374761) * u * (1 - v) +
    hash(ix + (iy + 1) * 374761) * (1 - u) * v +
    hash(ix + 1 + (iy + 1) * 374761) * u * v
  );
}

function fbm(x: number, y: number, octaves: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * (noise2D(x * f, y * f) * 2 - 1);
    a *= 0.5;
    f *= 2;
  }
  return v;
}

// ── Ribbon config ───────────────────────────────────────────────

interface Ribbon {
  baseY: number;
  speed: number;
  offset: number;
  amplitude: number;
  color: string;
  glow: string;
  thickness: number;
  blur: number;
}

export default function MistBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    // 7 laser ribbons: warm / cool alternating, fast & thin
    const ribbons: Ribbon[] = [
      { baseY: 0.12, speed: 0.0009,  offset: 0,    amplitude: 0.42, color: 'rgba(20,160,200,0.28)',  glow: 'rgba(20,160,200,0.15)',  thickness: 3, blur: 50 },
      { baseY: 0.24, speed: 0.0012,  offset: 1.2,  amplitude: 0.38, color: 'rgba(210,60,50,0.24)',   glow: 'rgba(210,60,50,0.12)',   thickness: 3, blur: 45 },
      { baseY: 0.38, speed: 0.0007,  offset: 2.5,  amplitude: 0.45, color: 'rgba(230,190,35,0.22)',  glow: 'rgba(230,190,35,0.10)',  thickness: 3, blur: 40 },
      { baseY: 0.52, speed: 0.0010,  offset: 3.8,  amplitude: 0.40, color: 'rgba(45,80,190,0.26)',   glow: 'rgba(45,80,190,0.13)',   thickness: 3, blur: 48 },
      { baseY: 0.65, speed: 0.0008,  offset: 5.1,  amplitude: 0.44, color: 'rgba(200,80,60,0.23)',   glow: 'rgba(200,80,60,0.11)',   thickness: 3, blur: 42 },
      { baseY: 0.78, speed: 0.0011,  offset: 6.4,  amplitude: 0.36, color: 'rgba(30,150,160,0.25)',  glow: 'rgba(30,150,160,0.12)',  thickness: 3, blur: 46 },
      { baseY: 0.90, speed: 0.0006,  offset: 7.7,  amplitude: 0.48, color: 'rgba(210,150,30,0.22)',  glow: 'rgba(210,150,30,0.10)',  thickness: 3, blur: 40 },
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const startTime = Date.now();
    let raf = 0;
    const numPoints = 50;

    function draw(time: number) {
      const elapsed = time - startTime;
      ctx!.clearRect(0, 0, width, height);

      const segmentWidth = width / (numPoints - 1);

      for (const r of ribbons) {
        // Build ribbon path points with layered sine waves for rhythm
        const points: { x: number; y: number }[] = [];
        const t = elapsed * r.speed;

        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const phase = t + r.offset + i * 0.55;

          // Primary wave + secondary harmonic = organic rhythm
          const wave1 = Math.sin(phase) * r.amplitude;
          const wave2 = Math.sin(phase * 1.7 + 1.3) * r.amplitude * 0.35;
          const wave3 = Math.cos(phase * 0.6 + 2.1) * r.amplitude * 0.15;

          const y = height * r.baseY + (wave1 + wave2 + wave3) * height * 0.5;
          points.push({ x, y });
        }

        // Glow layer (wider, softer)
        ctx!.save();
        ctx!.strokeStyle = r.glow;
        ctx!.lineWidth = r.thickness * 4;
        ctx!.lineCap = 'round';
        ctx!.lineJoin = 'round';
        ctx!.shadowColor = r.glow;
        ctx!.shadowBlur = r.blur;
        ctx!.beginPath();
        ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx!.lineTo(points[i].x, points[i].y);
        }
        ctx!.stroke();
        ctx!.restore();

        // Core layer (thin, bright)
        ctx!.save();
        ctx!.strokeStyle = r.color;
        ctx!.lineWidth = r.thickness;
        ctx!.lineCap = 'round';
        ctx!.lineJoin = 'round';
        ctx!.beginPath();
        ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx!.lineTo(points[i].x, points[i].y);
        }
        ctx!.stroke();
        ctx!.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1.0 }}
      aria-hidden="true"
    />
  );
}
