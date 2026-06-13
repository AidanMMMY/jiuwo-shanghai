import type { Metadata } from 'next';
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getJournalEntriesDarkroom, getSiteData, getUpcomingEvents } from '@/lib/data';
import { getShanghaiWeather, getWeatherRecommendation } from '@/lib/weather';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

export const metadata: Metadata = {
  description:
    "JIUWO — a queer-friendly cocktail bar on Julu Road, Shanghai. Natural wines, craft cocktails, and a warm, welcoming space. Open Tue–Sun 7pm–2am.",
  alternates: { canonical: '/' },
};

const guestbookLabels: GuestbookHookLabels = {
  countText: 'stamps so far',
  cta: 'Leave your own',
};

export default async function Page() {
  const [site, slides, entries, entriesDarkroom, guestbookEntries, guestbookTotal, weather, upcomingEvents] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
    getJournalEntriesDarkroom(),
    listEntries(10),
    countEntries(),
    getShanghaiWeather(),
    getUpcomingEvents(),
  ]);

  const weatherRec = weather ? getWeatherRecommendation(weather.code, weather.temp, weather.humidity, false) : null;

  const upcomingEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const specialEventCard = site.specialEvent?.enabled
    ? {
        hero: upcomingEvent
          ? upcomingEvent.label
          : site.specialEvent.heroFallback,
        hostName: upcomingEvent?.hostName,
        href: upcomingEvent
          ? `/special/${upcomingEvent.slug}`
          : '/special',
        isUpcoming: !!upcomingEvent,
      }
    : undefined;

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      entriesDarkroom={entriesDarkroom}
      journalTitle="Updates"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/guestbook"
      weather={weather}
      weatherRec={weatherRec}
      isZh={false}
      specialEventCard={specialEventCard}
    />
  );
}
