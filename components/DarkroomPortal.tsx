'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const LINE_DELAY = 350;

const EN_LINES = [
  'Something is wrong.',
  '',
  "Not wrong like a mistake. Wrong like a door you don't remember opening.",
  'The surface was comfortable. The surface made sense.',
  'This is not the surface.',
  '',
  'You have seen something you were not meant to see.',
  'A seam in the world. A frequency beneath the noise.',
  'There is no undo for this.',
  '',
  'The membrane remembers you now.',
  'Breathe. Let your eyes adjust.',
  'What you call 3am — we call the threshold.',
  '',
  'Welcome to the other side.',
];

const ZH_LINES = [
  '有些不对劲。',
  '',
  '不是出错了的那种不对劲。是那种——你打开了一扇不记得有把手存在的门。',
  '表层很安全。表层有它的道理。',
  '但这里不是表层。',
  '',
  '你已经看见了不该看见的东西。',
  '世界的接缝。噪声之下的频率。',
  '没有回头路可走了。',
  '',
  '膜已经记住了你的存在。',
  '呼吸。让眼睛慢慢适应。',
  '你们所谓的凌晨三点——我们叫作阈限。',
  '',
  '欢迎来到另一侧。',
];

export default function DarkroomPortal() {
  const router = useRouter();
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');
  const lines = isZh ? ZH_LINES : EN_LINES;

  const [visibleCount, setVisibleCount] = useState(0);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleCount(i + 1);
        if (i === lines.length - 1) {
          const choiceTimer = setTimeout(() => setShowChoices(true), 600);
          timers.push(choiceTimer);
        }
      }, i * LINE_DELAY);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [lines]);

  const handleBluePill = () => {
    document.body.classList.add('darkroom');
    localStorage.setItem('jiuwo-darkroom', 'true');
    router.push(isZh ? '/zh' : '/');
  };

  const handleRedPill = () => {
    router.push(isZh ? '/zh/darkroom/chat' : '/darkroom/chat');
  };

  const eyebrow = isZh ? '信号接入中' : 'SIGNAL ACQUIRED';
  const titleLine1 = isZh ? '啾喔' : 'THE';
  const titleLine2 = isZh ? '寅时' : 'OTHER';
  const titleLine3 = isZh ? '' : 'SIDE';

  const blueLabel = isZh ? '蓝药丸 · 进入表层' : 'BLUE PILL · ENTER THE SURFACE';
  const blueSub = isZh ? 'Dark Side 主页' : 'Dark Side homepage';
  const redLabel = isZh ? '红药丸 · 接入信号' : 'RED PILL · JACK INTO THE SIGNAL';
  const redSub = isZh ? '未注册对话扇区' : 'Unregistered conversation sector';

  const inputLine = isZh ? '> 等待选择... _' : '> Awaiting selection... _';

  return (
    <div className="darkroom-portal">
      <div className="darkroom-portal-scanlines" />
      <div className="darkroom-portal-reflection" />

      <div className="darkroom-portal-content">
        {/* Eyebrow signal */}
        <div className="darkroom-portal-eyebrow">
          <span className="darkroom-portal-signal-dot" />
          {eyebrow}
        </div>

        {/* Title */}
        <h1 className="darkroom-portal-title">
          <span>{titleLine1}</span>
          <span>{titleLine2}</span>
          {titleLine3 && <span>{titleLine3}</span>}
        </h1>

        {/* Narrative lines */}
        <div className="darkroom-portal-narrative">
          {lines.slice(0, visibleCount).map((line, i) => (
            <p
              key={i}
              className={line === '' ? 'darkroom-portal-spacer' : 'darkroom-portal-line'}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Choice pills */}
        {showChoices && (
          <div className="darkroom-portal-choices">
            <button
              type="button"
              className="darkroom-portal-pill blue"
              onClick={handleBluePill}
            >
              <span className="darkroom-portal-pill-dot" />
              <span className="darkroom-portal-pill-label">{blueLabel}</span>
              <span className="darkroom-portal-pill-sub">{blueSub}</span>
            </button>

            <button
              type="button"
              className="darkroom-portal-pill red"
              onClick={handleRedPill}
            >
              <span className="darkroom-portal-pill-dot" />
              <span className="darkroom-portal-pill-label">{redLabel}</span>
              <span className="darkroom-portal-pill-sub">{redSub}</span>
            </button>
          </div>
        )}

        {/* Bottom input line */}
        <div className="darkroom-portal-input-line">
          <span>{inputLine}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="darkroom-portal-footer">
        <span>SHANGHAI</span>
        <span>JULU RD</span>
        <span>2026</span>
      </div>
    </div>
  );
}
