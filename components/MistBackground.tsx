'use client';

import { useEffect, useRef } from 'react';

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

interface Blob {
  baseX: number;
  baseY: number;
  radius: number;
  color: [number, number, number];
  driftSpeed: number;
  driftOffset: number;
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

    const blobs: Blob[] = [
      { baseX: 0.20, baseY: 0.20, radius: 0.60, color: [168, 42, 74], driftSpeed: 0.00012, driftOffset: 0 },
      { baseX: 0.80, baseY: 0.35, radius: 0.55, color: [212, 168, 56], driftSpeed: 0.00018, driftOffset: 2.5 },
      { baseX: 0.35, baseY: 0.65, radius: 0.65, color: [107, 58, 122], driftSpeed: 0.00010, driftOffset: 5 },
      { baseX: 0.70, baseY: 0.80, radius: 0.50, color: [192, 96, 104], driftSpeed: 0.00015, driftOffset: 7.5 },
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

    function draw(time: number) {
      const elapsed = time - startTime;
      ctx!.clearRect(0, 0, width, height);

      for (const blob of blobs) {
        const nx = noise2D(elapsed * blob.driftSpeed + blob.driftOffset, 0);
        const ny = noise2D(elapsed * blob.driftSpeed + blob.driftOffset + 10, 0);

        const x = (blob.baseX + nx * 0.18) * width;
        const y = (blob.baseY + ny * 0.14) * height;
        const r = blob.radius * Math.max(width, height);

        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.032)`);
        gradient.addColorStop(0.4, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.018)`);
        gradient.addColorStop(1, 'rgba(10,10,10,0)');

        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, width, height);
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
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
}
