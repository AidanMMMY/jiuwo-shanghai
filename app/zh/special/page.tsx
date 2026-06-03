import type { Metadata } from 'next';
import SpecialEventPage from '@/app/components/pages/SpecialEventPage';
import { getSiteDataZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '特别活动',
  description: '啾喔一夜特别活动。一日店长接管吧台。',
};

export default async function Page() {
  const site = await getSiteDataZh();

  if (!site.specialEvent?.enabled) {
    return (
      <main className="bg-[#0a0a0a] min-h-screen flex items-center justify-center">
        <p className="text-[#a0a0a0]">暂无特别活动。</p>
      </main>
    );
  }

  return (
    <SpecialEventPage
      event={{
        label: site.specialEvent.label,
        title: site.specialEvent.title,
        date: site.specialEvent.date,
      }}
      backHref="/zh"
    />
  );
}
