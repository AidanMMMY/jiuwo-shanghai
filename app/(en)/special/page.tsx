import type { Metadata } from 'next';
import SpecialEventPage from '@/app/components/pages/SpecialEventPage';
import { getSiteData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Special Event',
  description: 'A special night at JIUWO. One-night guest bartender takeover.',
};

export default async function Page() {
  const site = await getSiteData();

  if (!site.specialEvent?.enabled) {
    return (
      <main className="bg-[#0a0a0a] min-h-[100lvh] flex items-center justify-center">
        <p className="text-[#a0a0a0]">No special event at this time.</p>
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
      backHref="/"
    />
  );
}
