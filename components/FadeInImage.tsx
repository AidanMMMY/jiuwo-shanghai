'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function FadeInImage({
  src,
  alt,
  fill,
  width,
  height,
  className = '',
  priority,
  sizes,
  ...props
}: {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
} & Record<string, unknown>) {
  const [loaded, setLoaded] = useState(false);

  const containerClass = `relative bg-[#111] transition-colors duration-700 ${loaded ? '' : 'animate-pulse'}`;
  const imageClass = `${className} transition-all duration-700 ease-out ${loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-[8px] scale-[1.02]'}`;

  if (fill) {
    return (
      <div className={containerClass}>
        <Image
          src={src}
          alt={alt}
          fill
          className={imageClass}
          onLoad={() => setLoaded(true)}
          priority={priority}
          sizes={sizes}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={containerClass} style={{ width: width || '100%', height: height || 'auto' }}>
      <Image
        src={src}
        alt={alt}
        width={width || 0}
        height={height || 0}
        className={imageClass}
        onLoad={() => setLoaded(true)}
        priority={priority}
        sizes={sizes}
        {...props}
      />
    </div>
  );
}
