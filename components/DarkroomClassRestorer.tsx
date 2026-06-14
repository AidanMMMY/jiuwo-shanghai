'use client';

import { useEffect } from 'react';

export default function DarkroomClassRestorer() {
  useEffect(() => {
    const saved = localStorage.getItem('jiuwo-darkroom');
    if (saved === 'true') {
      document.body.classList.add('darkroom');
    }
  }, []);
  return null;
}
