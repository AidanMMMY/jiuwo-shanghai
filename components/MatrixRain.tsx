'use client';

import { useEffect, useRef } from 'react';

interface MatrixRainProps {
  color?: string;
  fontSize?: number;
  speed?: number;
  density?: number;
}

export default function MatrixRain({
  color = '#22c55e',
  fontSize = 14,
  speed = 1.5,
  density = 1,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const columnsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ';

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);

      const columns = Math.floor(rect.width / fontSize);
      columnsRef.current = new Array(columns).fill(0).map(() => Math.random() * -150);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    const frameInterval = 1000 / (18 * speed);

    const draw = (time: number) => {
      animationRef.current = requestAnimationFrame(draw);
      if (time - lastTime < frameInterval) return;
      lastTime = time;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      // Longer trails for denser Matrix feel
      ctx.fillStyle = 'rgba(8, 8, 8, 0.12)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.font = `${fontSize}px var(--font-share-tech-mono), var(--font-space-mono), monospace`;

      const columns = columnsRef.current;
      for (let i = 0; i < columns.length; i++) {
        if (Math.random() > density) continue;

        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = columns[i] * fontSize;

        // Head is bright, tail fades
        const headAlpha = 0.85;
        const tailAlpha = Math.max(0.08, Math.min(0.45, (y / rect.height) * 0.4 + 0.1));

        // Draw bright head
        ctx.fillStyle = color + Math.round(headAlpha * 255).toString(16).padStart(2, '0');
        ctx.fillText(char, x, y);

        // Draw a few trailing characters below head
        for (let t = 1; t <= 4; t++) {
          const trailY = y - t * fontSize;
          if (trailY < 0) break;
          const trailChar = chars[Math.floor(Math.random() * chars.length)];
          const trailAlpha = Math.max(0, headAlpha - t * 0.18);
          ctx.fillStyle = color + Math.round(trailAlpha * 255).toString(16).padStart(2, '0');
          ctx.fillText(trailChar, x, trailY);
        }

        if (y > rect.height + 80 && Math.random() > 0.985) {
          columns[i] = 0;
        } else {
          columns[i]++;
        }
      }
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color, fontSize, speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
      aria-hidden="true"
    />
  );
}
