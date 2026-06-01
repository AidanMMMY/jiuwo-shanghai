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

interface Droplet {
  x: number;
  y: number;
  r: number;
  highlightX: number;
  highlightY: number;
  highlightR: number;
}

function makeDroplets(count: number, w: number, h: number): Droplet[] {
  const drops: Droplet[] = [];
  for (let i = 0; i < count; i++) {
    const x = hash2D(i * 3.7, 0) * w;
    const y = hash2D(i * 3.7 + 100, 0) * h;
    const r = 1.5 + hash2D(i * 3.7 + 200, 0) * 3.5; // 1.5–5px
    const angle = hash2D(i * 3.7 + 300, 0) * Math.PI * 2;
    const dist = r * 0.35;
    drops.push({
      x,
      y,
      r,
      highlightX: x + Math.cos(angle) * dist,
      highlightY: y + Math.sin(angle) * dist,
      highlightR: r * 0.25,
    });
  }
  return drops;
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
    let droplets: Droplet[] = [];

    const blobs: Blob[] = [
      { baseX: 0.15, baseY: 0.15, radius: 0.40, color: [168, 42, 74], driftSpeed: 0.0006, driftOffset: 0 },
      { baseX: 0.85, baseY: 0.20, radius: 0.38, color: [212, 168, 56], driftSpeed: 0.0008, driftOffset: 1.2 },
      { baseX: 0.30, baseY: 0.45, radius: 0.45, color: [107, 58, 122], driftSpeed: 0.0005, driftOffset: 2.4 },
      { baseX: 0.70, baseY: 0.55, radius: 0.42, color: [60, 100, 130], driftSpeed: 0.0007, driftOffset: 3.6 },
      { baseX: 0.20, baseY: 0.75, radius: 0.38, color: [192, 96, 104], driftSpeed: 0.00055, driftOffset: 4.8 },
      { baseX: 0.80, baseY: 0.80, radius: 0.44, color: [80, 130, 140], driftSpeed: 0.00065, driftOffset: 6.0 },
      { baseX: 0.50, baseY: 0.30, radius: 0.36, color: [201, 162, 39], driftSpeed: 0.00075, driftOffset: 7.2 },
    ];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      droplets = makeDroplets(35, width, height);
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

      // ── Soft glow blobs ──
      for (const blob of blobs) {
        const nx = noise2D(elapsed * blob.driftSpeed + blob.driftOffset, 0);
        const ny = noise2D(elapsed * blob.driftSpeed + blob.driftOffset + 10, 0);

        const x = (blob.baseX + nx * 0.30) * width;
        const y = (blob.baseY + ny * 0.24) * height;
        const r = blob.radius * Math.max(width, height);

        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, r);
        // Smoother 5-stop falloff
        gradient.addColorStop(0, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.07)`);
        gradient.addColorStop(0.18, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.055)`);
        gradient.addColorStop(0.38, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.035)`);
        gradient.addColorStop(0.65, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.015)`);
        gradient.addColorStop(0.88, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.005)`);
        gradient.addColorStop(1, 'rgba(10,10,10,0)');

        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, width, height);
      }

      // ── Glass droplets ──
      for (const d of droplets) {
        // Droplet body – soft dark ring with translucent center
        const bodyGrad = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        bodyGrad.addColorStop(0, 'rgba(180,180,180,0.04)');
        bodyGrad.addColorStop(0.6, 'rgba(140,140,140,0.08)');
        bodyGrad.addColorStop(0.85, 'rgba(100,100,100,0.06)');
        bodyGrad.addColorStop(1, 'rgba(10,10,10,0)');
        ctx!.fillStyle = bodyGrad;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fill();

        // White highlight – offset to mimic light source
        const hiGrad = ctx!.createRadialGradient(
          d.highlightX, d.highlightY, 0,
          d.highlightX, d.highlightY, d.highlightR,
        );
        hiGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        hiGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        hiGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx!.fillStyle = hiGrad;
        ctx!.beginPath();
        ctx!.arc(d.highlightX, d.highlightY, d.highlightR, 0, Math.PI * 2);
        ctx!.fill();
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
      style={{ opacity: 0.9 }}
      aria-hidden="true"
    />
  );
}
