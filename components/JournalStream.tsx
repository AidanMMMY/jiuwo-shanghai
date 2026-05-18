import { markdownToHtml } from '@/lib/utils';
import JournalStreamList from './JournalStreamList';
import type { JournalEntry } from '@/lib/data';

export default async function JournalStream({
  entries,
  title,
}: {
  entries: JournalEntry[];
  title?: string;
}) {
  const htmlEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      contentHtml: await markdownToHtml(entry.content),
    }))
  );

  return <JournalStreamList entries={htmlEntries} title={title} />;
}
