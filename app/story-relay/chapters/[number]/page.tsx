import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChapterByNumber } from '@/lib/story-relay';
import { StoryRelayChapterDetail } from '@/components/StoryRelayChapterDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Chapter ${number}`,
    description: `Archived relay story chapter ${number} from JIUWO Shanghai.`,
  };
}

export default async function StoryRelayChapterPage({ params }: Props) {
  const { number } = await params;
  const chapterNumber = parseInt(number, 10);
  if (Number.isNaN(chapterNumber)) notFound();

  const chapter = await getChapterByNumber(chapterNumber);
  if (!chapter) notFound();

  const segments = Array.isArray(chapter.segmentsJson)
    ? chapter.segmentsJson.map((s: unknown) => {
        const seg = s as Record<string, unknown>;
        return {
          sequence: seg.sequence as number,
          authorName: seg.authorName as string,
          storyZh: seg.storyZh as string,
          storyEn: seg.storyEn as string,
        };
      })
    : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0]">
      <StoryRelayChapterDetail
        chapter={{
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          createdAt: chapter.createdAt,
          archivedAt: chapter.archivedAt,
          segments,
        }}
        isZh={false}
      />
    </main>
  );
}
