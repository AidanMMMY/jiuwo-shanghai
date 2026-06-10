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
  baseY: number; // vertical centre (0–1)
  thickness: number; // thickness in px
  coreColor: string;
  glowColor: string;
  shadowColor: string;
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
        speed: 0.0003,
        offset: 0,
        amplitude: 0.52,
        baseY: 0.30,
        thickness: 280,
        noiseScale: 2.0,
        coreColor: 'rgba(168,42,74,0.10)',
        glowColor: 'rgba(212,120,72,0.05)',
        shadowColor: 'rgba(168,42,74,0.10)',
      },
      {
        speed: 0.00055,
        offset: 1.8,
        amplitude: 0.58,
        baseY: 0.50,
        thickness: 320,
        noiseScale: 2.8,
        coreColor: 'rgba(232,200,96,0.10)',
        glowColor: 'rgba(212,168,56,0.05)',
        shadowColor: 'rgba(201,162,39,0.10)',
      },
      {
        speed: 0.0002,
        offset: 3.5,
        amplitude: 0.52,
        baseY: 0.70,
        thickness: 280,
        noiseScale: 3.5,
        coreColor: 'rgba(107,58,122,0.10)',
        glowColor: 'rgba(60,100,130,0.04)',
        shadowColor: 'rgba(90,70,120,0.08)',
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

    function drawSmoothTopEdge(
      c: CanvasRenderingContext2D,
      pts: { x: number; y: number }[],
    ) {
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
    }

    function draw(time: number) {
      const elapsed = time - startTime;
      scrollY.current += (targetScrollY.current - scrollY.current) * 0.05;

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = '#0a0a0a';
      ctx!.fillRect(0, 0, width, height);

      const segmentWidth = width / (numPoints - 1);

      for (const ribbon of ribbons) {
        const t = elapsed * ribbon.speed;
        const scrollPhase = scrollY.current * 0.001;

        // ── Top edge ──
        const topPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const nx = (i / numPoints) * ribbon.noiseScale;
          const n = fbm2D(nx + ribbon.offset, t + scrollPhase, 3);
          const y = height * ribbon.baseY + n * height * ribbon.amplitude;
          topPoints.push({ x, y });
        }

        // ── Bottom edge (same noise field, different offset so it moves independently) ──
        const bottomPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = i * segmentWidth;
          const nx = (i / numPoints) * ribbon.noiseScale;
          const n = fbm2D(nx + ribbon.offset + 2.0, t + scrollPhase, 3);
          const y =
            height * ribbon.baseY +
            ribbon.thickness +
            n * height * ribbon.amplitude * 0.55;
          bottomPoints.push({ x, y });
        }

        // ── Draw ribbon as a closed band ──
        ctx!.save();

        const grad = ctx!.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, 'rgba(10,10,10,0)');
        grad.addColorStop(0.15, ribbon.glowColor);
        grad.addColorStop(0.5, ribbon.coreColor);
        grad.addColorStop(0.85, ribbon.glowColor);
        grad.addColorStop(1, 'rgba(10,10,10,0)');
        ctx!.fillStyle = grad;

        ctx!.shadowColor = ribbon.shadowColor;
        ctx!.shadowBlur = 55;

        ctx!.beginPath();
        drawSmoothTopEdge(ctx!, topPoints);
        // Right cap
        ctx!.lineTo(
          bottomPoints[bottomPoints.length - 1].x,
          bottomPoints[bottomPoints.length - 1].y,
        );
        // Bottom edge (reverse, dense lineTo is smooth enough with blur)
        for (let i = bottomPoints.length - 2; i >= 0; i--) {
          ctx!.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
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
      className="aurora-bg fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  );
}
