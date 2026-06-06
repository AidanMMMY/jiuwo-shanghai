'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
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

  return (
    <div className="relative bg-[#0a0a0a]">
      {/* Poster section */}
      <div className="relative w-full md:max-w-lg mx-auto h-[100vh] mt-0 md:h-[calc(100dvh-4rem)] md:mt-16 overflow-hidden">
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
        <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-black via-black/80 to-transparent" />

        {/* Bottom gradient: fades image into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent pointer-events-none" />

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-40% to-[#0a0a0a]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/20 via-transparent to-[#0a0a0a]/20" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col px-6 pt-20 pb-4 md:pt-4 md:pb-4">

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
          <div className="w-full pb-2 mb-6">
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

      {/* RSVP List — for upcoming events with RSVP */}
      {showRsvp && (
        <div className="w-full md:max-w-lg mx-auto px-6 py-12 border-t border-[#222]">
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
        <div className="w-full md:max-w-lg mx-auto px-6 py-12 border-t border-[#222]">
          {/* Past RSVP list (read-only) */}
          <h2
            className="text-lg text-[#f5f5f0]/70 tracking-[0.2em] mb-6"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 400 }}
          >
            {t("Who Came", '到场的朋友')}
          </h2>
          {loading ? (
            <p className="text-sm text-[#666] tracking-wider italic">
              {t('Loading…', '加载中…')}
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[#666] tracking-wider italic">
              {t('No RSVPs for this event.', '暂无报名记录。')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {entries
                .filter((entry, index, self) => index === self.findIndex((e) => e.name === entry.name))
                .map((entry) => (
                  <p key={entry.id} className="text-sm text-[#f5f5f0]/90 tracking-wider">
                    <span className="text-[#c9a227]">{entry.name}</span>
                  </p>
                ))}
            </div>
          )}

          {/* Retrospective content */}
          {retrospective && (
            <div className="mt-12 pt-12 border-t border-[#222]">
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

          {/* Retrospective photos */}
          {event.retrospectivePhotos && event.retrospectivePhotos.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3">
              {event.retrospectivePhotos.map((photo, i) => (
                <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-lg">
                  <Image
                    src={photo}
                    alt={t(`Recap photo ${i + 1}`, `回顾照片 ${i + 1}`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 256px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
