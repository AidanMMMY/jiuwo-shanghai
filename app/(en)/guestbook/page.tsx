import GuestbookPage from '@/app/components/pages/GuestbookPage';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookLabels } from '@/lib/guestbook';

export const revalidate = 60;

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
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <main className="bg-[#0a0a0a] min-h-screen px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl text-red-400 mb-4">Error loading guestbook</h1>
          <pre className="text-sm text-[#a0a0a0] whitespace-pre-wrap">{message}</pre>
        </div>
      </main>
    );
  }
}
