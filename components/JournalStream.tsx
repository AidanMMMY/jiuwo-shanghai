import path from 'node:path';
import sharp from 'sharp';
import { markdownToHtml } from '@/lib/utils';
import JournalStreamList from './JournalStreamList';
import type { JournalEntry } from '@/lib/data';

async function isCoverLandscape(coverPath: string): Promise<boolean> {
  try {
    const file = path.join(process.cwd(), 'public', coverPath);
    const { width = 0, height = 0 } = await sharp(file).metadata();
    return width >= height;
  } catch {
    return true;
  }
}

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
      coverIsLandscape: await isCoverLandscape(entry.cover),
    }))
  );

  return <JournalStreamList entries={htmlEntries} title={title} />;
}
