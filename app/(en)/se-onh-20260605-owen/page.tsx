import type { Metadata } from 'next';
import SpecialEventPage from '@/app/components/pages/SpecialEventPage';
import { getSiteData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Special Event',
  description: 'A special night at JIUWO. One-night guest bartender takeover.',
};

export default async function Page() {
  const site = await getSiteData();

  return (
    <SpecialEventPage
      event={{
        label: site.specialEvent?.label || '',
        title: site.specialEvent?.title || '',
        hostName: site.specialEvent?.hostName || '',
        date: site.specialEvent?.date || '',
        isZh: false,
      }}
      backHref="/"
    />
  );
}
