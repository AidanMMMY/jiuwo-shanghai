import type { Metadata } from 'next';
import HomePage from '@/app/components/pages/HomePage';
import DarkroomClassRestorer from '@/components/DarkroomClassRestorer';
import { getHeroSlides, getSiteDataZh, getUpcomingEventsZh, getFeaturedZh, getCalendarEventsZh } from '@/lib/data';
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
  const [site, slides, guestbookEntries, guestbookTotal, upcomingEvents, featured, calendarEvents] = await Promise.all([
    getSiteDataZh(),
    getHeroSlides(),
    listEntries(10),
    countEntries(),
    getUpcomingEventsZh(),
    getFeaturedZh().catch(() => undefined),
    getCalendarEventsZh().catch(() => undefined),
  ]);

  const upcomingEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const specialEventCard = site.specialEvent?.enabled
    ? {
        hero: upcomingEvent
          ? upcomingEvent.label
          : site.specialEvent.heroFallback,
        hostName: upcomingEvent?.hostName,
        href: upcomingEvent
          ? `/zh/special/${upcomingEvent.slug}`
          : '/zh/special',
        isUpcoming: !!upcomingEvent,
      }
    : undefined;

  return (
    <>
      <DarkroomClassRestorer />
      <HomePage
        site={site}
        slides={slides}
        guestbookEntries={guestbookEntries}
        guestbookTotal={guestbookTotal}
        guestbookLabels={guestbookLabels}
        guestbookHref="/zh/guestbook"
        isZh={true}
        specialEventCard={specialEventCard}
        featured={featured}
        calendarEvents={calendarEvents}
      />
    </>
  );
}
