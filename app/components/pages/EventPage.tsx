'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import type { EventItemResolved } from '@/lib/data';

interface RsvpEntry {
  id: number;
  name: string;
  created_at: string;
}

export default function EventPage({
  event,
  backHref,
  isZh,
}: {
  event: EventItemResolved;
  backHref: string;
  isZh: boolean;
}) {
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const title = t(event.title, event.titleZh);
  const hostName = event.hostName;
  const dateDisplay = t(event.dateDisplay, event.dateDisplayZh);
  const description = t(event.description, event.descriptionZh);
  const subtitle = t(event.subtitle, event.subtitleZh);
  const venue = t(event.venue, event.venueZh);
  const retrospective = t(event.retrospective || '', event.retrospectiveZh || '');

  const showRsvp = event.isUpcoming && event.rsvpEnabled;
  const showRetrospective = !event.isUpcoming;

  const storageKey = `jiuwo-rsvp-${event.slug}`;
  const eventSlug = event.slug;

  const [showModal, setShowModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [entries, setEntries] = useState<RsvpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

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
        setSubmitError(data.error || t('Something went wrong. Please try again.', '出错了，请稍后再试。'));
      }
    } catch (err) {
      console.error('RSVP submit failed:', err);
      setSubmitError(t('Network error. Please check your connection and try again.', '网络错误，请检查连接后重试。'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowModal(false);
  };

  // Deterministic hash for name positioning (avoids hydration mismatch)
  function nameHash(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 1000) / 1000;
  }

  // Deduplicated entries for floating names
  const dedupedEntries = useMemo(
    () => entries.filter((e, i, self) => i === self.findIndex((x) => x.name === e.name)),
    [entries]
  );

  // Side names — allow repeats for density; static positions; breathing via CSS only
  const sideNames = useMemo(() => {
    interface NamePos {
      id: number;
      name: string;
      x: number;
      y: number;
      delay: number;
      duration: number;
      size: number;
    }
    const left: NamePos[] = [];
    const right: NamePos[] = [];

    entries.forEach((entry, i) => {
      const base = {
        id: entry.id,
        name: entry.name,
        delay: (i * 0.9) % 18,
        duration: 13 + (entry.id * 3) % 10,
        size: 0.9 + nameHash(entry.name, 3) * 1.4,
      };
      if (i % 2 === 0) {
        left.push({
          ...base,
          x: 2 + nameHash(entry.name, 5) * 26,
          y: 4 + nameHash(entry.name, 7) * 88,
        });
      } else {
        right.push({
          ...base,
          x: 72 + nameHash(entry.name, 6) * 26,
          y: 4 + nameHash(entry.name, 8) * 88,
        });
      }
    });

    return { left, right };
  }, [entries]);

  return (
    <div className="relative bg-[#0a0a0a]">
      {/* Full-width glow wrapper — desktop only */}
      <div className="relative w-full overflow-hidden">
        {/* Warm radial glow spreading from poster center */}
        <div className="hidden md:block absolute inset-0 pointer-events-none z-0" aria-hidden="true">
          <div className="absolute inset-[-40%] event-side-glow" />
        </div>

        {/* Poster section */}
        <div className="relative z-[2] w-full md:max-w-lg mx-auto h-[100dvh] mt-0 md:h-[calc(100dvh-4rem)] md:mt-16 overflow-hidden" style={{ minHeight: '-webkit-fill-available' }}>
        {/* Background image */}
        <Image
          src={event.poster}
          alt={title}
          fill
          className="object-cover object-[center_5%]"
          priority
          sizes="(max-width: 768px) 100vw, 512px"
        />

        {/* Top gradient: fades image into black background */}
        <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />

        {/* Bottom gradient: subtle fade at the very edge for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent pointer-events-none" />

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-40% to-[#0a0a0a]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/20 via-transparent to-[#0a0a0a]/20" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col px-4 pt-20 pb-0 md:pt-4 md:pb-4">

          {/* Back link */}
          <Link
            href={backHref}
            className="self-start text-xs tracking-[0.2em] text-[#f5f5f0]/50 hover:text-[#c9a227] transition-colors duration-300 z-20"
          >
            ← {t('BACK', '返回')}
          </Link>

          {/* Top: Main title + host name */}
          <div className="text-center pt-6">
            <h1
              className="text-[1.4rem] leading-[1] md:text-[1.8rem] text-[#f5f5f0] tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
            >
              {title}
            </h1>

            {hostName && (
              <p
                className="text-[2.5rem] md:text-[3.2rem] text-[#c9a227] mt-1 italic"
                style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 400 }}
              >
                {hostName}
              </p>
            )}

            {/* CTA Button — only for upcoming events with RSVP enabled */}
            {showRsvp && (
              <button
                type="button"
                onClick={() => { setShowModal(true); setSubmitError(''); }}
                className="mt-4 px-6 py-2.5 border border-[#c9a227] text-[#c9a227] bg-[#0a0a0a]/50 text-xs tracking-[0.3em] font-medium rounded-full animate-pulse-scale hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
              >
                {t('I WANNA COME', '我要来')}
              </button>
            )}
          </div>

          {/* Flexible space - pushes bottom content down */}
          <div className="flex-1" />

          {/* Bottom: Description + Date + Venue */}
          <div className="w-full pb-2">
            {/* Description */}
            <div className="text-left mb-2 max-w-[280px]">
              {subtitle && (
                <p className="text-lg text-[#f5f5f0] leading-[1.4] font-bold mb-1">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="text-base text-[#f5f5f0]/85 leading-[1.6] whitespace-pre-line">
                  {description}
                </p>
              )}
            </div>

            {/* Date + Venue */}
            <div className="flex justify-between items-end">
              <div>
                <p
                  className="text-[2.4rem] leading-[0.85] md:text-[2.8rem] text-[#f5f5f0] tracking-tight"
                  style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
                >
                  {dateDisplay}
                </p>
                {venue && (
                  <p className="text-xs text-[#f5f5f0]/70 tracking-[0.25em] mt-1">
                    {venue}
                  </p>
                )}
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

      {/* Side floating names — desktop only, in left/right gutters */}
      {showRetrospective && (
        <div className="hidden md:block absolute inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden="true">
          {sideNames.left.map((n) => (
            <span
              key={n.id}
              className="absolute whitespace-nowrap side-name select-none"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                fontSize: `${n.size * 1.3}rem`,
                animationDelay: `${n.delay}s`,
                animationDuration: `${n.duration}s`,
              }}
            >
              {n.name}
            </span>
          ))}
          {sideNames.right.map((n) => (
            <span
              key={n.id}
              className="absolute whitespace-nowrap side-name select-none"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                fontSize: `${n.size * 1.3}rem`,
                animationDelay: `${n.delay}s`,
                animationDuration: `${n.duration}s`,
              }}
            >
              {n.name}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* RSVP List — for upcoming events with RSVP */}
      {showRsvp && (
        <div className="w-full md:max-w-lg mx-auto px-4 py-12 border-t border-[#222]">
          <h2
            className="text-lg text-[#f5f5f0]/70 tracking-[0.2em] mb-6"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 400 }}
          >
            {t("Who's Coming", '谁来啦')}
          </h2>
          {loading ? (
            <p className="text-sm text-[#666] tracking-wider italic">
              {t('Loading…', '加载中…')}
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[#666] tracking-wider italic">
              {t("No one yet. Be the first!", '还没人来，做第一个！')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {entries
                .filter((entry, index, self) => index === self.findIndex((e) => e.name === entry.name))
                .map((entry) => (
                  <p key={entry.id} className="text-sm text-[#f5f5f0]/90 tracking-wider">
                    <span className="text-[#c9a227]">{entry.name}</span>
                    {' '}
                    {t('is coming', '要来')}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Retrospective section — for past events */}
      {showRetrospective && (
        <>
          {/* ─── Desktop: Gold divider + count ─── */}
          <div className="hidden md:block w-full pt-24">
            <div className="flex items-center gap-6 max-w-lg mx-auto px-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
              <p className="text-[10px] tracking-[0.25em] text-[#c9a227]/40 shrink-0">
                {t('Who Came', '到场的朋友')}
                {!loading && dedupedEntries.length > 0 && (
                  <span className="ml-1 text-[#c9a227]/60">· {dedupedEntries.length}</span>
                )}
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
            </div>
          </div>

          {/* ─── Mobile: Flowing name cloud ─── */}
          <div className="md:hidden w-full max-w-lg mx-auto px-4 py-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent" />
              <p className="text-[10px] tracking-[0.25em] text-[#c9a227]/40 shrink-0">
                {t('Who Came', '到场的朋友')}
                {!loading && dedupedEntries.length > 0 && (
                  <span className="ml-1 text-[#c9a227]/60">· {dedupedEntries.length}</span>
                )}
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent" />
            </div>
            {loading ? (
              <p className="text-center text-sm text-[#666] tracking-wider italic">
                {t('Loading…', '加载中…')}
              </p>
            ) : entries.length === 0 ? (
              <p className="text-center text-sm text-[#666] tracking-wider italic">
                {t('No RSVPs for this event.', '暂无报名记录。')}
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2.5">
                {dedupedEntries.map((entry) => (
                  <span
                    key={entry.id}
                    className="inline-block border border-[#c9a227]/15 rounded-full px-3.5 py-1.5 text-sm text-[#c9a227] tracking-wider hover:border-[#c9a227]/40 hover:bg-[#c9a227]/5 transition-colors duration-300"
                  >
                    {entry.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ─── Retrospective content (centered, shared) ─── */}
          {retrospective && (
            <div className="w-full md:max-w-lg mx-auto px-4 pt-8 md:pt-12 border-t border-[#222] md:border-t-0">
              <h2
                className="text-lg text-[#f5f5f0]/70 tracking-[0.2em] mb-6"
                style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 400 }}
              >
                {t('Recap', '活动回顾')}
              </h2>
              <div className="text-sm text-[#d0d0d0] leading-relaxed whitespace-pre-line tracking-wider">
                {retrospective}
              </div>
            </div>
          )}

          {/* ─── Retrospective photos (centered, shared) ─── */}
          {event.retrospectivePhotos && event.retrospectivePhotos.length > 0 && (
            <div className="w-full md:max-w-4xl mx-auto px-4 mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {event.retrospectivePhotos.map((photo, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={photo}
                    alt={t(`Recap photo ${i + 1}`, `回顾照片 ${i + 1}`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Animations for warm radial glow + side floating names */}
      <style>{`
        @keyframes sideGlowDrift {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          20%  { transform: translate(4%, -3%) rotate(1.5deg) scale(1.08); }
          40%  { transform: translate(-1%, 4%) rotate(-0.8deg) scale(1.04); }
          60%  { transform: translate(-3%, -1%) rotate(1deg) scale(1.06); }
          80%  { transform: translate(2%, 2%) rotate(-1.2deg) scale(1.03); }
        }
        @keyframes sideGlowBreathe {
          0%, 100% { opacity: 0.45; }
          30%  { opacity: 0.95; }
          60%  { opacity: 0.6; }
          80%  { opacity: 0.88; }
        }
        @keyframes sideGlowShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes nameFadeFloat {
          0%, 100% { opacity: 0; transform: scale(0.88); filter: blur(3.5px); }
          18%      { opacity: 0.35; transform: scale(1.04); filter: blur(0px); }
          35%      { opacity: 0.40; transform: scale(1.06); filter: blur(0px); }
          55%      { opacity: 0.25; transform: scale(1); filter: blur(1px); }
          75%      { opacity: 0.08; transform: scale(0.94); filter: blur(2.5px); }
        }
        .event-side-glow {
          background:
            radial-gradient(ellipse 65% 55% at 50% 50%, rgba(201,162,39,0.28) 0%, transparent 45%),
            radial-gradient(ellipse 50% 38% at 32% 45%, rgba(220,140,80,0.18) 0%, transparent 50%),
            radial-gradient(ellipse 55% 42% at 68% 48%, rgba(200,90,110,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 45% 32% at 48% 38%, rgba(240,200,70,0.20) 0%, transparent 55%),
            radial-gradient(ellipse 75% 65% at 50% 52%, rgba(201,162,39,0.10) 0%, transparent 60%);
          background-size: 150% 150%;
          animation: sideGlowDrift 10s ease-in-out infinite, sideGlowBreathe 4s ease-in-out infinite, sideGlowShimmer 15s ease-in-out infinite;
          filter: blur(40px);
        }
        .side-name {
          font-family: var(--font-inter), system-ui, sans-serif;
          font-weight: 700;
          letter-spacing: 0.04em;
          font-style: italic;
          color: rgba(201,162,39,0.40);
          animation: nameFadeFloat 14s ease-in-out infinite backwards;
          will-change: opacity, transform, filter;
          backface-visibility: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .event-side-glow { animation: none !important; }
          .side-name { animation: none !important; opacity: 0.3 !important; filter: blur(1px) !important; }
        }
      `}</style>

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
              {t("Who's Coming?", '你叫？')}
            </h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setSubmitError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={t('Your name', '你的名字')}
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
                {t('CANCEL', '取消')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 border border-[#c9a227] text-[#c9a227] text-xs tracking-[0.2em] font-medium rounded-full hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
              >
                {t('SUBMIT', '提交')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
