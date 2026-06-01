'use client';

import { useEffect, useRef } from 'react';

// ── 2D value noise (no external deps) ───────────────────────────

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  const n00 = hash2D(ix, iy);
  const n10 = hash2D(ix + 1, iy);
  const n01 = hash2D(ix, iy + 1);
  const n11 = hash2D(ix + 1, iy + 1);

  return n00 * (1 - sx) * (1 - sy)
    + n10 * sx * (1 - sy)
    + n01 * (1 - sx) * sy
    + n11 * sx * sy;
}

function fbm2D(x: number, y: number, octaves: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * ((noise2D(x * freq, y * freq) - 0.5) * 2);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// ── Ribbon config ───────────────────────────────────────────────

interface Ribbon {
  speed: number;
  offset: number;
  amplitude: number;
  color: string;
  noiseScale: number;
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
      { speed: 0.0003, offset: 0, amplitude: 0.28, color: 'rgba(201,162,39,0.10)', noiseScale: 2.0 },
      { speed: 0.0004, offset: 1.5, amplitude: 0.22, color: 'rgba(201,162,39,0.08)', noiseScale: 2.8 },
      { speed: 0.00025, offset: 3.0, amplitude: 0.32, color: 'rgba(160,120,30,0.06)', noiseScale: 3.5 },
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const startTime = Date.now();
    const numPoints = 40;

    function draw(time: number) {
      const elapsed = time - startTime;
      scrollY.current += (targetScrollY.current - scrollY.current) * 0.05;

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = '#0a0a0a';
      ctx!.fillRect(0, 0, width, height);

      const segmentWidth = width / (numPoints - 1);

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

        // Pre-compute all points — noise-driven, fully continuous
        const points: { x: number; y: number }[] = [];
        const t = elapsed * ribbon.speed;
        const scrollPhase = scrollY.current * 0.001;

        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const nx = (i / numPoints) * ribbon.noiseScale;
          const n = fbm2D(nx + ribbon.offset, t + scrollPhase, 3);
          const y = height * 0.35 + n * height * ribbon.amplitude;
          points.push({ x, y });
        }

        // Draw C1-continuous smooth curve through points
        // Midpoint quadratic bezier: control point = Pi, endpoint = midpoint(Pi, Pi+1)
        ctx!.beginPath();
        ctx!.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx!.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        // Last segment
        ctx!.quadraticCurveTo(
          points[points.length - 2].x,
          points[points.length - 2].y,
          points[points.length - 1].x,
          points[points.length - 1].y,
        );

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
