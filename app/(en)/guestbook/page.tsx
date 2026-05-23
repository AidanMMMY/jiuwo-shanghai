import GuestbookPage from '@/app/components/pages/GuestbookPage';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookLabels } from '@/lib/guestbook';

export const dynamic = 'force-dynamic';

const labels: GuestbookLabels = {
  title: 'GUESTBOOK',
  subtitle: 'Leave a mark on the wall',
  cta: 'Leave a stamp',
  countPrefix: '',
  countSuffix: ' stamps',
  nameLabel: 'Your name',
  messageLabel: 'Your message',
  emailLabel: 'Email (optional)',
  emailHint: 'Never displayed publicly',
  stampSelectLabel: 'Choose your stamp',
  submitButton: 'Pour ink',
  rateLimitMessage: "You've left a few stamps already — try again in a bit.",
  closeButton: 'Close',
  emptyState: 'No stamps yet. Be the first!',
};

export default async function Page() {
  const [entries, totalCount] = await Promise.all([
    listEntries(),
    countEntries(),
  ]);

  return (
    <GuestbookPage
      entries={entries}
      totalCount={totalCount}
      labels={labels}
      locale="en"
    />
  );
}
