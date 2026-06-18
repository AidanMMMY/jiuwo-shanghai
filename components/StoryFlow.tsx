'use client';

import { useEffect, useRef } from 'react';

interface StoryFlowProps {
  color?: string;
  accent?: string;
}

export default function StoryFlow({
  color = '#c9a227',
  accent = '#f5f5f0',
}: StoryFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = 0;
    let height = 0;

    // Soft organic blobs: flower / jellyfish bodies
    const blobs: {
      x: number;
      y: number;
      r: number;
      phase: number;
      speed: number;
      ampX: number;
      ampY: number;
      breathe: number;
    }[] = [];

    // Sine ribbons: animal / pedestrian motion traces
    const ribbons: {
      yBase: number;
      amplitude: number;
      frequency: number;
      phase: number;
      speed: number;
      offset: number;
    }[] = [];

    // Tiny drifting particles: pollen / footsteps
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }[] = [];

    const init = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      blobs.length = 0;
      const blobCount = Math.max(3, Math.floor(width / 180));
      for (let i = 0; i < blobCount; i++) {
        blobs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 30 + Math.random() * 70,
          phase: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.25,
          ampX: 20 + Math.random() * 50,
          ampY: 15 + Math.random() * 40,
          breathe: 0.5 + Math.random() * 0.8,
        });
      }

      ribbons.length = 0;
      const ribbonCount = Math.max(2, Math.floor(height / 120));
      for (let i = 0; i < ribbonCount; i++) {
        ribbons.push({
          yBase: ((i + 0.5) / ribbonCount) * height,
          amplitude: 8 + Math.random() * 18,
          frequency: 0.004 + Math.random() * 0.006,
          phase: Math.random() * Math.PI * 2,
          speed: 0.2 + Math.random() * 0.3,
          offset: Math.random() * 1000,
        });
      }

      particles.length = 0;
      const particleCount = Math.max(8, Math.floor((width * height) / 25000));
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25 - 0.1,
          r: 0.6 + Math.random() * 1.2,
          alpha: 0.15 + Math.random() * 0.35,
        });
      }
    };

    init();
    window.addEventListener('resize', init);

    let lastTime = 0;
    const draw = (time: number) => {
      animationRef.current = requestAnimationFrame(draw);
      // Cap at ~30fps for gentle, cinematic motion
      if (time - lastTime < 33) return;
      lastTime = time;
      const t = time * 0.001;

      // Clear with the card base color so traces feel like ink in water
      ctx.clearRect(0, 0, width, height);

      // Draw soft organic blobs (flower / jellyfish / animal silhouettes)
      ctx.globalCompositeOperation = 'screen';
      for (const b of blobs) {
        const x = b.x + Math.sin(t * b.speed + b.phase) * b.ampX;
        const y = b.y + Math.cos(t * b.speed * 0.7 + b.phase) * b.ampY;
        const r = b.r * (1 + Math.sin(t * b.breathe + b.phase) * 0.12);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `${color}18`); // ~10% alpha core
        grad.addColorStop(0.45, `${color}0d`);
        grad.addColorStop(1, `${color}00`);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle ivory highlight to keep it from being only gold
        const highlight = ctx.createRadialGradient(
          x - r * 0.25,
          y - r * 0.25,
          0,
          x,
          y,
          r * 0.6
        );
        highlight.addColorStop(0, `${accent}0a`);
        highlight.addColorStop(1, `${accent}00`);
        ctx.fillStyle = highlight;
        ctx.fill();
      }

      // Draw morphing sine ribbons (walking paths / tails / vines)
      ctx.globalCompositeOperation = 'source-over';
      for (const r of ribbons) {
        const yBase = r.yBase + Math.sin(t * 0.15 + r.offset) * 12;
        const amp = r.amplitude * (1 + Math.sin(t * 0.4 + r.phase) * 0.3);
        const freq = r.frequency * (1 + Math.cos(t * 0.2) * 0.15);
        const phase = r.phase + t * r.speed;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const y =
            yBase +
            Math.sin(x * freq + phase) * amp +
            Math.sin(x * freq * 2.3 + phase * 1.7) * (amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${color}14`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Draw drifting particles (pollen / footsteps / distant lights)
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;
        if (p.y < -4) p.y = height + 4;
        if (p.y > height + 4) p.y = -4;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${accent}${Math.round(p.alpha * 255)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.fill();
      }
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', init);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color, accent]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-75 group-hover:opacity-95 transition-opacity duration-700 pointer-events-none"
      aria-hidden="true"
    />
  );
}
