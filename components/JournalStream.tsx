import { markdownToHtml } from '@/lib/utils';
import JournalStreamList from './JournalStreamList';
import type { JournalEntry } from '@/lib/data';

export default async function JournalStream({
  entries,
  entriesDarkroom,
  title,
}: {
  entries: JournalEntry[];
  entriesDarkroom?: JournalEntry[];
  title?: string;
}) {
  const htmlEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      contentHtml: await markdownToHtml(entry.content),
    }))
  );

  const darkroomMap = entriesDarkroom
    ? new Map(
        await Promise.all(
          entriesDarkroom.map(async (entry) => [
            entry.slug,
            {
              ...entry,
              contentHtml: await markdownToHtml(entry.content),
            },
          ])
        ) as [string, JournalEntry & { contentHtml: string }][]
      )
    : undefined;

  return <JournalStreamList entries={htmlEntries} darkroomMap={darkroomMap} title={title} />;
}
