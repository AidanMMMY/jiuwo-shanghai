import { NextResponse } from 'next/server';
import { getChapters } from '@/lib/story-relay';

function uniqueAuthors(segments: unknown[]): number {
  const names = new Set<string>();
  for (const s of segments) {
    const seg = s as Record<string, unknown>;
    if (typeof seg.authorName === 'string') names.add(seg.authorName);
  }
  return names.size;
}

function firstParagraphPreview(storyZh: string, maxLength = 80): string {
  const cleaned = storyZh.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).replace(/\s+[^\s]*$/, '') + '…';
}

export async function GET() {
  try {
    const chapters = await getChapters();
    const summaries = chapters.map((c) => {
      const segments = Array.isArray(c.segmentsJson) ? c.segmentsJson : [];
      const firstSegment = segments[0] as Record<string, unknown> | undefined;
      const lastSegment = segments[segments.length - 1] as Record<string, unknown> | undefined;
      return {
        id: c.id,
        chapterNumber: c.chapterNumber,
        createdAt: c.createdAt,
        archivedAt: c.archivedAt,
        segmentCount: segments.length,
        contributorCount: uniqueAuthors(segments),
        preview: firstSegment?.storyZh ? firstParagraphPreview(String(firstSegment.storyZh)) : '',
        lastAuthor: lastSegment?.authorName ? String(lastSegment.authorName) : '',
      };
    });

    return NextResponse.json({ chapters: summaries });
  } catch (err) {
    console.error('story-relay/chapters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
