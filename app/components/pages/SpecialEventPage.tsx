'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface RsvpEntry {
  id: number;
  name: string;
  created_at: string;
}

interface SpecialEvent {
  label: string;
  title: string;
  hostName?: string;
  date: string;
  isZh?: boolean;
}

function extractMonthDay(dateStr: string, isZh?: boolean): string {
  if (isZh) {
    const match = dateStr.match(/(\d+)月(\d+)日/);
    if (match) return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}`;
  } else {
    const match = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
    if (match) {
      return `${match[1].substring(0, 3)} ${parseInt(match[2], 10)}`;
    }
  }
  return 'Jun 5';
}

function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;

      // Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];
        const alpha = data[i + 3];
        if (alpha < 128) continue;

        const brightness = pr * 0.299 + pg * 0.587 + pb * 0.114;
        if (brightness < 40) continue; // Skip too-dark pixels

        // Skip near-grayscale
        const max = Math.max(pr, pg, pb);
        const min = Math.min(pr, pg, pb);
        if (max > 0 && (max - min) / max < 0.15) continue;

        r += pr;
        g += pg;
        b += pb;
        count++;
      }

      if (count === 0) {
        // Fallback: average all non-transparent pixels
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count === 0) {
        resolve('#c9a227');
        return;
      }

      resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
    };
    img.onerror = () => resolve('#c9a227');
    img.src = imageUrl;
  });
}

function extractWeekday(dateStr: string, isZh?: boolean): string {
  if (isZh) {
    const match = dateStr.match(/周([一二三四五六日])/);
    if (match) {
      const map: Record<string, string> = {
        '一': 'MON', '二': 'TUE', '三': 'WED', '四': 'THU',
        '五': 'FRI', '六': 'SAT', '日': 'SUN',
      };
      return map[match[1]] || 'FRI';
    }
  } else {
    const match = dateStr.match(/^([A-Za-z]+)/);
    if (match) return match[1].substring(0, 3).toUpperCase();
  }
  return 'FRI';
}

export default function SpecialEventPage({
  event,
  backHref,
}: {
  event: SpecialEvent;
  backHref: string;
}) {
  const isZh = event.isZh;
  const monthDay = extractMonthDay(event.date, isZh);
  const weekday = extractWeekday(event.date, isZh);
  const weekdayZh: Record<string, string> = {
    MON: '周一', TUE: '周二', WED: '周三', THU: '周四',
    FRI: '周五', SAT: '周六', SUN: '周日',
  };

  const [showModal, setShowModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [entries, setEntries] = useState<RsvpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [themeColor, setThemeColor] = useState('rgb(201, 162, 39)'); // default gold

  const storageKey = 'jiuwo-rsvp-20260605';
  const eventSlug = 'event-20260605';

  // Load entries from API
  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/rsvp?event=${eventSlug}`);
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch (err) {
      console.error('Failed to fetch RSVP entries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract theme color from poster for desktop ambient glow
  useEffect(() => {
    extractDominantColor('/images/events/event-20260605-2.webp').then(setThemeColor).catch(() => {});
  }, []);

  // Migrate any localStorage entries to the database on first load
  useEffect(() => {
    const migrateLocalStorage = async () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const localEntries = JSON.parse(raw) as { name: string; timestamp?: number }[];
        if (!Array.isArray(localEntries) || localEntries.length === 0) return;

        // Post each local entry to the API
        for (const entry of localEntries) {
          if (!entry.name?.trim()) continue;
          await fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: entry.name.trim(), eventSlug }),
          });
        }

        // Clear localStorage after successful migration
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    };

    migrateLocalStorage().then(fetchEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSubmitError('');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, eventSlug }),
      });
      if (res.ok) {
        await fetchEntries();
        setNameInput('');
        setShowModal(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('RSVP submit failed:', err);
      setSubmitError('Network error. Please check your connection and try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowModal(false);
  };

  return (
    <div className="relative bg-[#0a0a0a]">
      {/* Desktop ambient glow — extracted from poster theme color */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 50% 50% at 50% 38%, ${themeColor}35 0%, ${themeColor}18 30%, ${themeColor}08 55%, transparent 80%),
            radial-gradient(ellipse 80% 80% at 50% 45%, ${themeColor}15 0%, ${themeColor}06 40%, transparent 70%)
          `,
        }}
      />

      {/* Poster section */}
      <div className="relative w-full md:max-w-lg mx-auto h-[100vh] mt-0 md:h-[calc(100dvh-4rem)] md:mt-16 overflow-hidden">
        {/* Background image - shifted down so head is lower, title sits above */}
        <Image
          src="/images/events/event-20260605-2.webp"
          alt={event.title}
          fill
          className="object-cover object-[center_5%]"
          priority
          sizes="(max-width: 768px) 100vw, 512px"
        />

        {/* Top gradient: fades image into black background */}
        <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-black via-black/80 to-transparent" />

        {/* Bottom gradient: fades image into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent pointer-events-none" />

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-40% to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col px-6 pt-20 pb-4 md:pt-4 md:pb-4">

          {/* Back link */}
          <Link
            href={backHref}
            className="self-start text-xs tracking-[0.2em] text-[#f5f5f0]/50 hover:text-[#c9a227] transition-colors duration-300 z-20"
          >
            ← {isZh ? '返回' : 'BACK'}
          </Link>

          {/* Top: Main title - single line, smaller; Owen below in gold, larger */}
          <div className="text-center pt-6">
            <h1
              className="text-[1.4rem] leading-[1] md:text-[1.8rem] text-[#f5f5f0] tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
            >
              {isZh ? '一日店长' : 'ONE NIGHT HOST'}
            </h1>

            {event.hostName && (
              <p
                className="text-[2.5rem] md:text-[3.2rem] text-[#c9a227] mt-1 italic"
                style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 400 }}
              >
                {event.hostName}
              </p>
            )}

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => { setShowModal(true); setSubmitError(''); }}
              className="mt-4 px-6 py-2.5 border border-[#c9a227] text-[#c9a227] bg-[#0a0a0a]/50 text-xs tracking-[0.3em] font-medium rounded-full animate-pulse-scale hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
            >
              {isZh ? '我要来' : 'I WANNA COME'}
            </button>
          </div>

          {/* Flexible space - pushes bottom content down, keeps face clear */}
          <div className="flex-1" />

          {/* Bottom: Description + Date + Venue */}
          <div className="w-full pb-2 mb-6">
            {/* Description - left aligned, same left edge as date */}
            <div className="text-left mb-2 max-w-[280px]">
              <p className="text-lg text-[#f5f5f0] leading-[1.4] font-bold mb-1">
                {isZh ? '法网之夜' : 'The Night of Roland Garros'}
              </p>
              <p className="text-base text-[#f5f5f0]/85 leading-[1.6] whitespace-pre-line">
                {isZh
                  ? '在啾喔群分享一张自己的网球日常照片，换法网特色鸡尾酒一杯。'
                  : 'Share a tennis photo in the group, get a French Open-themed cocktail on the house.'
                }
              </p>
            </div>

            {/* Date + Venue */}
            <div className="flex justify-between items-end">
              <div>
                <p
                  className="text-[3rem] leading-[0.85] md:text-[3.5rem] text-[#f5f5f0] tracking-tight"
                  style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
                >
                  {monthDay}
                </p>
                <p className="text-xs text-[#f5f5f0]/70 tracking-[0.25em] mt-1">
                  {isZh
                    ? `${weekdayZh[weekday] || weekday}晚在巨鹿路397号`
                    : `${weekday} NIGHT @ Julu Rd. 397`
                  }
                </p>
              </div>

              <div className="flex flex-col items-end">
                <Image
                  src="/images/logo-with-words-light.png"
                  alt="JIUWO"
                  width={48}
                  height={80}
                  className="mb-1 opacity-70"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RSVP List */}
      <div className="w-full md:max-w-lg mx-auto px-6 py-12 border-t border-[#222]">
        <h2
          className="text-lg text-[#f5f5f0]/70 tracking-[0.2em] mb-6"
          style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 400 }}
        >
          {isZh ? '谁来啦' : "Who's Coming"}
        </h2>
        {loading ? (
          <p className="text-sm text-[#666] tracking-wider italic">
            {isZh ? '加载中…' : 'Loading…'}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#666] tracking-wider italic">
            {isZh ? '还没人来，做第一个！' : 'No one yet. Be the first!'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <p key={entry.id} className="text-sm text-[#f5f5f0]/90 tracking-wider">
                <span className="text-[#c9a227]">{entry.name}</span>
                {' '}
                {isZh ? '要来' : 'is coming'}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => { setShowModal(false); setSubmitError(''); }}
        >
          <div
            className="bg-[#0a0a0a] border border-[#c9a227]/50 rounded-lg px-8 py-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg text-[#f5f5f0] tracking-[0.15em] mb-8 text-center"
              style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
            >
              {isZh ? '你叫？' : "Who's Coming?"}
            </h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setSubmitError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={isZh ? '你的名字' : 'Your name'}
              autoFocus
              className="bg-transparent border-b border-[#c9a227]/50 text-[#f5f5f0] text-center tracking-wider placeholder:text-[#666] focus:border-[#c9a227] outline-none px-2 py-3 w-full"
            />
            {submitError && (
              <p className="text-xs text-red-400/80 text-center tracking-wider mt-2 mb-6">
                {submitError}
              </p>
            )}
            <div className={`flex gap-3 justify-center ${submitError ? '' : 'mt-8'}`}>
              <button
                type="button"
                onClick={() => { setShowModal(false); setSubmitError(''); }}
                className="px-5 py-2 text-xs tracking-[0.2em] text-[#888] hover:text-[#f5f5f0] transition-colors"
              >
                {isZh ? '取消' : 'CANCEL'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 border border-[#c9a227] text-[#c9a227] text-xs tracking-[0.2em] font-medium rounded-full hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
              >
                {isZh ? '提交' : 'SUBMIT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
