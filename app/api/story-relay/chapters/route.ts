import { NextResponse } from 'next/server';
import { getChapters } from '@/lib/story-relay';

export async function GET() {
  try {
    const chapters = await getChapters();
    return NextResponse.json({
      chapters: chapters.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        createdAt: c.createdAt,
        archivedAt: c.archivedAt,
        segmentCount: Array.isArray(c.segmentsJson) ? c.segmentsJson.length : 0,
      })),
    });
  } catch (err) {
    console.error('story-relay/chapters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
