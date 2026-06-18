import type { Metadata } from 'next';
import { getChapters } from '@/lib/story-relay';
import { StoryRelayChapterList } from '@/components/StoryRelayChapterList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '往期篇章',
  description: 'JIUWO 啾喔故事接力的归档篇章。',
  alternates: { canonical: '/zh/story-relay/chapters' },
};

export default async function StoryRelayChaptersPageZh() {
  const chapters = await getChapters();
  const summaries = chapters.map((c) => ({
    id: c.id,
    chapterNumber: c.chapterNumber,
    createdAt: c.createdAt,
    archivedAt: c.archivedAt,
    segmentCount: Array.isArray(c.segmentsJson) ? c.segmentsJson.length : 0,
  }));

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0]">
      <StoryRelayChapterList chapters={summaries} isZh={true} />
    </main>
  );
}
