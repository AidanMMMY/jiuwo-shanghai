import type { Metadata } from 'next';
import SpecialEventPage from '@/app/components/pages/SpecialEventPage';
import { getSiteDataZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '特别活动',
  description: '啾喔一夜特别活动。一日店长接管吧台。',
};

export default async function Page() {
  const site = await getSiteDataZh();

  return (
    <SpecialEventPage
      event={{
        label: site.specialEvent?.label || '',
        title: site.specialEvent?.title || '',
        hostName: site.specialEvent?.hostName || '',
        date: site.specialEvent?.date || '',
        isZh: true,
      }}
      backHref="/zh"
    />
  );
}
