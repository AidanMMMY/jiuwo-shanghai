'use client';

import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  enabled?: boolean;
  speedMs?: number;
  className?: string;
  onDone?: () => void;
}

export function TypewriterText({ text, enabled = false, speedMs = 28, className = '', onDone }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState(enabled ? '' : text);

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      return;
    }

    setDisplayText('');
    const chars = Array.from(text);
    let index = 0;

    const tick = () => {
      if (index < chars.length) {
        index += 1;
        setDisplayText(chars.slice(0, index).join(''));
        const nextDelay = /\s/.test(chars[index - 1]) ? speedMs * 2.5 : speedMs;
        timer = setTimeout(tick, nextDelay);
      } else if (onDone) {
        onDone();
      }
    };

    let timer = setTimeout(tick, speedMs);

    return () => clearTimeout(timer);
  }, [text, enabled, speedMs, onDone]);

  return (
    <span className={className}>
      {displayText}
      {enabled && displayText.length < text.length && (
        <span className="inline-block h-[1em] w-[2px] animate-pulse bg-[#c9a227] align-middle" />
      )}
    </span>
  );
}
