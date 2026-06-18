import { NextResponse } from 'next/server';
import { getChapterByNumber } from '@/lib/story-relay';

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  try {
    const { number } = await params;
    const chapterNumber = parseInt(number, 10);
    if (Number.isNaN(chapterNumber)) {
      return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 });
    }

    const chapter = await getChapterByNumber(chapterNumber);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const segments = Array.isArray(chapter.segmentsJson) ? chapter.segmentsJson : [];

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        createdAt: chapter.createdAt,
        archivedAt: chapter.archivedAt,
        segments,
      },
    });
  } catch (err) {
    console.error('story-relay/chapters/[number] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
