'use client';

import { useEffect, useRef } from 'react';

interface MatrixRainProps {
  color?: string;
  fontSize?: number;
  speed?: number;
  density?: number;
}

export default function MatrixRain({
  color = '#c9a227',
  fontSize = 12,
  speed = 1.2,
  density = 0.8,
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

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

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
      columnsRef.current = new Array(columns).fill(0).map(() => Math.random() * -100);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    const frameInterval = 1000 / (15 * speed);

    const draw = (time: number) => {
      animationRef.current = requestAnimationFrame(draw);
      if (time - lastTime < frameInterval) return;
      lastTime = time;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      ctx.fillStyle = 'rgba(10, 10, 10, 0.18)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.font = `${fontSize}px var(--font-share-tech-mono), var(--font-space-mono), monospace`;

      const columns = columnsRef.current;
      for (let i = 0; i < columns.length; i++) {
        if (Math.random() > density) continue;

        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = columns[i] * fontSize;

        // Fade in/out based on vertical position for depth
        const alpha = Math.max(0.05, Math.min(0.45, (y / rect.height) * 0.4 + 0.05));
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillText(char, x, y);

        if (y > rect.height && Math.random() > 0.975) {
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
      className="absolute inset-0 w-full h-full opacity-[0.22] group-hover:opacity-[0.45] transition-opacity duration-700 pointer-events-none"
      aria-hidden="true"
    />
  );
}
