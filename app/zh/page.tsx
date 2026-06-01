import type { Metadata } from 'next';
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntriesZh, getSiteDataZh } from '@/lib/data';
import { getShanghaiWeather, getWeatherRecommendation } from '@/lib/weather';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '啾喔 — 上海葡萄酒、鸡尾酒吧',
  description:
    'JIUWO 啾喔，上海巨鹿路上一家友好的鸡尾酒吧。自然酒、手工鸡尾酒、岩茶，温馨 welcoming 的空间。周二至周日晚上7点营业。',
  alternates: { canonical: '/zh' },
  openGraph: {
    locale: 'zh_CN',
  },
};

const guestbookLabels: GuestbookHookLabels = {
  countText: '枚印章',
  cta: '留下你的',
};

export default async function Page() {
  const [site, slides, entries, guestbookEntries, guestbookTotal, weather] = await Promise.all([
    getSiteDataZh(),
    getHeroSlides(),
    getJournalEntriesZh(),
    listEntries(10),
    countEntries(),
    getShanghaiWeather(),
  ]);

  const weatherRec = weather ? getWeatherRecommendation(weather.code, true) : null;

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="最新动态"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/zh/guestbook"
      weather={weather}
      weatherRec={weatherRec}
    />
  );
}
