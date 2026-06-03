import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
import GuestbookHook from '@/components/GuestbookHook';
import WeatherVibe from '@/components/WeatherVibe';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';
import type { GuestbookEntry, GuestbookHookLabels } from '@/lib/guestbook';
import type { WeatherData, WeatherRecommendation } from '@/lib/weather';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
  guestbookEntries,
  guestbookTotal,
  guestbookLabels,
  guestbookHref,
  weather,
  weatherRec,
  isZh,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
  guestbookEntries: GuestbookEntry[];
  guestbookTotal: number;
  guestbookLabels: GuestbookHookLabels;
  guestbookHref: string;
  weather?: WeatherData | null;
  weatherRec?: WeatherRecommendation | null;
  isZh?: boolean;
}) {
  return (
    <>
      <HeroCarousel
        slides={slides}
        title={site.name}
        tagline={site.tagline}
        intro={site.intro}
        specialEvent={site.specialEvent?.enabled ? site.specialEvent : undefined}
        specialEventHref={site.specialEvent?.enabled ? (isZh ? '/zh/special' : '/special') : undefined}
      />
      <WeatherVibe weather={weather ?? null} recommendation={weatherRec ?? null} isZh={isZh} />
      <JournalStream entries={entries} title={journalTitle} />
      <GuestbookHook
        entries={guestbookEntries}
        totalCount={guestbookTotal}
        labels={guestbookLabels}
        href={guestbookHref}
      />
    </>
  );
}
