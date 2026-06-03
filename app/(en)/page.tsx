import type { Metadata } from 'next';
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';
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
  const [site, slides, entries, guestbookEntries, guestbookTotal, weather] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
    listEntries(10),
    countEntries(),
    getShanghaiWeather(),
  ]);

  const weatherRec = weather ? getWeatherRecommendation(weather.code, false) : null;

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="Updates"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/guestbook"
      weather={weather}
      weatherRec={weatherRec}
      isZh={false}
    />
  );
}
