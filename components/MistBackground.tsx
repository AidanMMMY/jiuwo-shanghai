'use client';

import { useEffect, useRef } from 'react';

// ── 2D value noise ──────────────────────────────────────────────

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
  baseY: number;
  thickness: number;
  color: string;
  shadowColor: string;
  noiseScale: number;
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

    // 6 aurora ribbons: thick, overlapping, warm / cool mix
    const ribbons: Ribbon[] = [
      {
        speed: 0.00035, offset: 0,    amplitude: 0.48, baseY: 0.18,
        thickness: 320, noiseScale: 2.2,
        color: 'rgba(168,42,74,0.07)',    shadowColor: 'rgba(168,42,74,0.08)',
      },
      {
        speed: 0.00050, offset: 1.5,  amplitude: 0.55, baseY: 0.32,
        thickness: 360, noiseScale: 2.8,
        color: 'rgba(20,140,180,0.06)',   shadowColor: 'rgba(20,140,180,0.07)',
      },
      {
        speed: 0.00040, offset: 3.0,  amplitude: 0.52, baseY: 0.46,
        thickness: 340, noiseScale: 2.5,
        color: 'rgba(220,180,40,0.06)',   shadowColor: 'rgba(220,180,40,0.07)',
      },
      {
        speed: 0.00055, offset: 4.5,  amplitude: 0.50, baseY: 0.58,
        thickness: 380, noiseScale: 3.0,
        color: 'rgba(45,80,170,0.06)',    shadowColor: 'rgba(45,80,170,0.07)',
      },
      {
        speed: 0.00030, offset: 6.0,  amplitude: 0.45, baseY: 0.72,
        thickness: 300, noiseScale: 2.0,
        color: 'rgba(200,80,60,0.06)',    shadowColor: 'rgba(200,80,60,0.07)',
      },
      {
        speed: 0.00045, offset: 7.5,  amplitude: 0.50, baseY: 0.86,
        thickness: 340, noiseScale: 2.6,
        color: 'rgba(30,150,160,0.06)',   shadowColor: 'rgba(30,150,160,0.07)',
      },
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
    const numPoints = 36;

    function draw(time: number) {
      const elapsed = time - startTime;
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = '#0a0a0a';
      ctx!.fillRect(0, 0, width, height);

      const segmentWidth = width / (numPoints - 1);

      for (const ribbon of ribbons) {
        const t = elapsed * ribbon.speed;

        // Top edge
        const topPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const nx = (i / numPoints) * ribbon.noiseScale;
          const n = fbm2D(nx + ribbon.offset, t, 3);
          const y = height * ribbon.baseY + n * height * ribbon.amplitude;
          topPoints.push({ x, y });
        }

        // Bottom edge
        const bottomPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const nx = (i / numPoints) * ribbon.noiseScale;
          const n = fbm2D(nx + ribbon.offset + 1.8, t, 3);
          const y = height * ribbon.baseY + ribbon.thickness + n * height * ribbon.amplitude * 0.5;
          bottomPoints.push({ x, y });
        }

        // Draw ribbon band
        ctx!.save();
        ctx!.shadowColor = ribbon.shadowColor;
        ctx!.shadowBlur = 70;
        ctx!.fillStyle = ribbon.color;

        ctx!.beginPath();
        ctx!.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 0; i < topPoints.length - 2; i++) {
          const xc = (topPoints[i].x + topPoints[i + 1].x) / 2;
          const yc = (topPoints[i].y + topPoints[i + 1].y) / 2;
          ctx!.quadraticCurveTo(topPoints[i].x, topPoints[i].y, xc, yc);
        }
        ctx!.quadraticCurveTo(
          topPoints[topPoints.length - 2].x,
          topPoints[topPoints.length - 2].y,
          topPoints[topPoints.length - 1].x,
          topPoints[topPoints.length - 1].y,
        );
        // Bottom edge reverse
        ctx!.lineTo(bottomPoints[bottomPoints.length - 1].x, bottomPoints[bottomPoints.length - 1].y);
        for (let i = bottomPoints.length - 2; i >= 0; i--) {
          ctx!.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
        ctx!.closePath();
        ctx!.fill();
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
      style={{ opacity: 0.75 }}
      aria-hidden="true"
    />
  );
}
