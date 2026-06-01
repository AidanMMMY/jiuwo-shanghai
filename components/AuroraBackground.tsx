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
  coreColor: string;   // center hue (most saturated)
  glowColor: string;   // transition hue toward edges
  shadowColor: string; // shadow/glow color
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
      {
        speed: 0.0003, offset: 0, amplitude: 0.28, noiseScale: 2.0,
        coreColor: 'rgba(232,200,96,0.12)',    // bright gold center
        glowColor: 'rgba(212,168,56,0.07)',     // amber edges
        shadowColor: 'rgba(201,162,39,0.12)',
      },
      {
        speed: 0.0004, offset: 1.5, amplitude: 0.22, noiseScale: 2.8,
        coreColor: 'rgba(216,140,80,0.10)',     // warm orange center
        glowColor: 'rgba(192,96,104,0.05)',     // rose edges
        shadowColor: 'rgba(212,120,72,0.10)',
      },
      {
        speed: 0.00025, offset: 3.0, amplitude: 0.32, noiseScale: 3.5,
        coreColor: 'rgba(192,96,104,0.08)',     // deep rose center
        glowColor: 'rgba(168,42,74,0.04)',      // crimson edges
        shadowColor: 'rgba(180,80,90,0.08)',
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

    function drawRibbonPath(
      c: CanvasRenderingContext2D,
      pts: { x: number; y: number }[],
      w: number,
      h: number,
    ) {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 2; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        c.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      c.quadraticCurveTo(
        pts[pts.length - 2].x,
        pts[pts.length - 2].y,
        pts[pts.length - 1].x,
        pts[pts.length - 1].y,
      );
      c.lineTo(w, h);
      c.lineTo(0, h);
      c.closePath();
      c.fill();
    }

    function draw(time: number) {
      const elapsed = time - startTime;
      scrollY.current += (targetScrollY.current - scrollY.current) * 0.05;

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = '#0a0a0a';
      ctx!.fillRect(0, 0, width, height);

      const segmentWidth = width / (numPoints - 1);

      for (const ribbon of ribbons) {
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

        // ── Warm sunset ribbon with rainbow hue per layer ──
        ctx!.save();

        // Horizontal rainbow gradient: dark at edges, warm hues in the middle
        const rainbowGrad = ctx!.createLinearGradient(0, 0, width, 0);
        rainbowGrad.addColorStop(0, 'rgba(10,10,10,0)');
        rainbowGrad.addColorStop(0.15, ribbon.glowColor);
        rainbowGrad.addColorStop(0.5, ribbon.coreColor);
        rainbowGrad.addColorStop(0.85, ribbon.glowColor);
        rainbowGrad.addColorStop(1, 'rgba(10,10,10,0)');
        ctx!.fillStyle = rainbowGrad;

        ctx!.shadowColor = ribbon.shadowColor;
        ctx!.shadowBlur = 60;

        drawRibbonPath(ctx!, points, width, height);
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
