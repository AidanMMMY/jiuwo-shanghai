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

    // Warm / cool alternating for strong contrast
    const blobs: Blob[] = [
      { baseX: 0.12, baseY: 0.18, radius: 0.42, color: [200, 60, 60],  driftSpeed: 0.00065, driftOffset: 0 },    // warm: red
      { baseX: 0.78, baseY: 0.22, radius: 0.40, color: [40, 130, 170], driftSpeed: 0.00085, driftOffset: 1.5 },  // cool: cyan
      { baseX: 0.30, baseY: 0.48, radius: 0.46, color: [220, 180, 50], driftSpeed: 0.00055, driftOffset: 3.0 },  // warm: gold
      { baseX: 0.72, baseY: 0.52, radius: 0.44, color: [80, 60, 160],  driftSpeed: 0.00070, driftOffset: 4.5 },  // cool: deep blue
      { baseX: 0.18, baseY: 0.78, radius: 0.40, color: [210, 80, 120], driftSpeed: 0.00060, driftOffset: 6.0 },  // warm: rose
      { baseX: 0.85, baseY: 0.75, radius: 0.44, color: [30, 140, 150], driftSpeed: 0.00075, driftOffset: 7.5 },  // cool: teal
      { baseX: 0.50, baseY: 0.35, radius: 0.38, color: [230, 170, 40], driftSpeed: 0.00090, driftOffset: 9.0 },  // warm: amber
      { baseX: 0.55, baseY: 0.65, radius: 0.40, color: [60, 90, 180],  driftSpeed: 0.00050, driftOffset: 10.5 }, // cool: blue
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

      // Use 'screen' blend so overlapping glows merge smoothly without hard edges
      ctx!.globalCompositeOperation = 'screen';

      for (const blob of blobs) {
        const nx = noise2D(elapsed * blob.driftSpeed + blob.driftOffset, 0);
        const ny = noise2D(elapsed * blob.driftSpeed + blob.driftOffset + 10, 0);

        const x = (blob.baseX + nx * 0.32) * width;
        const y = (blob.baseY + ny * 0.26) * height;
        const r = blob.radius * Math.max(width, height);

        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, r);
        // Very smooth 8-stop falloff – no perceptible banding
        gradient.addColorStop(0,    `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.09)`);
        gradient.addColorStop(0.10, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.075)`);
        gradient.addColorStop(0.25, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.055)`);
        gradient.addColorStop(0.42, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.035)`);
        gradient.addColorStop(0.60, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.018)`);
        gradient.addColorStop(0.76, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.008)`);
        gradient.addColorStop(0.90, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.003)`);
        gradient.addColorStop(1,    'rgba(0,0,0,0)');

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalCompositeOperation = 'source-over';
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
