'use client';

import { useEffect, useRef } from 'react';

// ── Simplex-like 2D noise ──────────────────────────────────────

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

// ── Colour helpers ─────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth palette: bright cyan → blue → purple → warm amber → deep red
function palette(t: number): [number, number, number] {
  // t ∈ [0,1], wrap smoothly
  const p = [
    [20, 140, 185],  // bright cyan (laser-like)
    [45, 85, 165],   // vivid blue
    [75, 55, 125],   // purple
    [175, 105, 30],  // warm amber
    [165, 40, 50],   // deep red
    [25, 130, 170],  // back toward bright cool
  ];

  const scaled = t * (p.length - 1);
  const i = Math.floor(scaled) % p.length;
  const j = (i + 1) % p.length;
  const localT = scaled - Math.floor(scaled);
  const st = localT * localT * (3 - 2 * localT);

  return [
    lerp(p[i][0], p[j][0], st),
    lerp(p[i][1], p[j][1], st),
    lerp(p[i][2], p[j][2], st),
  ];
}

// ── Component ──────────────────────────────────────────────────

const FOG_SCALE = 18; // low-res factor: finer texture

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

    // Offscreen low-res canvas for the fog texture
    const fogCanvas = document.createElement('canvas');
    const fogCtx = fogCanvas.getContext('2d', { willReadFrequently: true })!;

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
    let frame = 0;

    function draw(time: number) {
      const elapsed = time - startTime;
      frame++;

      // Update fog texture every 2nd frame to save CPU
      if (frame % 2 === 0) {
        const fogW = Math.max(1, Math.ceil(width / FOG_SCALE));
        const fogH = Math.max(1, Math.ceil(height / FOG_SCALE));

        if (fogCanvas.width !== fogW || fogCanvas.height !== fogH) {
          fogCanvas.width = fogW;
          fogCanvas.height = fogH;
        }

        const img = fogCtx.createImageData(fogW, fogH);
        const d = img.data;

        // Faster drift for more dynamism
        const driftX = elapsed * 0.00008;
        const driftY = elapsed * 0.00006;

        for (let py = 0; py < fogH; py++) {
          for (let px = 0; px < fogW; px++) {
            const nx = px / fogW;
            const ny = py / fogH;

            // Two layered noises: one drives hue, one drives brightness
            const hueNoise = fbm(nx * 1.8 + driftX, ny * 1.8 + driftY, 3);
            const brightNoise = fbm(nx * 2.5 - driftX * 0.7, ny * 2.5 + driftY * 0.5, 2);

            // Laser streaks: thin bright bands that cut through the fog
            const laserNoise = fbm(nx * 0.5 + driftX * 3, ny * 5 + driftY * 2, 2);
            const laserBoost = Math.max(0, laserNoise) * 0.55;

            // Map hueNoise [-1,1] → palette position [0,1]
            const hueT = (hueNoise + 1) * 0.5;
            const [cr, cg, cb] = palette(hueT);

            // Brighter so texture and palette are visible
            const brightness = (0.65 + brightNoise * 0.30) * (1 + laserBoost);
            const alpha = (0.10 + brightNoise * 0.06) * (1 + laserBoost * 0.6);

            const idx = (py * fogW + px) * 4;
            d[idx] = cr * brightness;
            d[idx + 1] = cg * brightness;
            d[idx + 2] = cb * brightness;
            d[idx + 3] = alpha * 255;
          }
        }

        fogCtx.putImageData(img, 0, 0);
      }

      // Draw scaled fog to main canvas (bilinear interpolation = smooth)
      ctx!.clearRect(0, 0, width, height);
      ctx!.drawImage(fogCanvas, 0, 0, width, height);

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
