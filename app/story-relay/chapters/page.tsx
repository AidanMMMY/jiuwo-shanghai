import type { Metadata } from 'next';
import { getChapters } from '@/lib/story-relay';
import { StoryRelayChapterList } from '@/components/StoryRelayChapterList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Past Chapters',
  description: 'Archived relay stories from JIUWO Shanghai.',
  alternates: { canonical: '/story-relay/chapters' },
};

export default async function StoryRelayChaptersPage() {
  const chapters = await getChapters();
  const summaries = chapters.map((c) => {
    const segments = Array.isArray(c.segmentsJson) ? c.segmentsJson : [];
    const firstSegment = segments[0] as Record<string, unknown> | undefined;
    const lastSegment = segments[segments.length - 1] as Record<string, unknown> | undefined;
    const names = new Set<string>();
    for (const s of segments) {
      const seg = s as Record<string, unknown>;
      if (typeof seg.authorName === 'string') names.add(seg.authorName);
    }
    const preview = firstSegment?.storyZh
      ? String(firstSegment.storyZh).replace(/\s+/g, ' ').trim().slice(0, 80).replace(/\s+[^\s]*$/, '') + '…'
      : '';

    return {
      id: c.id,
      chapterNumber: c.chapterNumber,
      createdAt: c.createdAt,
      archivedAt: c.archivedAt,
      segmentCount: segments.length,
      contributorCount: names.size,
      preview,
      lastAuthor: lastSegment?.authorName ? String(lastSegment.authorName) : '',
    };
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0]">
      <StoryRelayChapterList chapters={summaries} isZh={false} />
    </main>
  );
}
