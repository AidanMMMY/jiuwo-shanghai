import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { archiveCurrentChapter, insertSegment, getNextSequence, getMemoriesForNameExtraction, deleteAllCharacters, upsertCharacter } from '@/lib/story-relay';
import { generateStoryOpening, extractNamesFromMemories, extractCharactersFromSegment } from '@/lib/story-relay-ai';

const resetSchema = z.object({
  token: z.string(),
});

const STORY_RELAY_ADMIN_TOKEN = process.env.STORY_RELAY_ADMIN_TOKEN;

export async function POST(req: NextRequest) {
  try {
    if (!STORY_RELAY_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Admin token not configured' }, { status: 500 });
    }
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (parsed.data.token !== STORY_RELAY_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const chapter = await archiveCurrentChapter();
    await deleteAllCharacters();

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);
    const generated = await generateStoryOpening(names);

    const sequence = await getNextSequence();
    const segment = await insertSegment({
      sequence,
      authorName: 'AI',
      userPrompt: null,
      aiQuestionZh: generated.questionZh,
      aiQuestionEn: generated.questionEn,
      storyZh: generated.storyZh,
      storyEn: generated.storyEn,
      suggestion1Zh: generated.suggestion1Zh,
      suggestion1En: generated.suggestion1En,
      suggestion2Zh: generated.suggestion2Zh,
      suggestion2En: generated.suggestion2En,
      suggestion3Zh: generated.suggestion3Zh,
      suggestion3En: generated.suggestion3En,
      summaryZh: null,
      summaryEn: null,
      sessionId: null,
    });

    try {
      const extracted = await extractCharactersFromSegment(segment.storyZh, segment.storyEn, []);
      for (const entry of extracted) {
        await upsertCharacter(entry.name, entry.descriptionZh, entry.descriptionEn, segment.sequence);
      }
    } catch (characterErr) {
      console.error('[story-relay/reset] character extraction failed:', characterErr);
    }

    return NextResponse.json({ chapter, segment });
  } catch (err) {
    console.error('story-relay/reset error:', err);
    return NextResponse.json({ error: 'Failed to reset story' }, { status: 500 });
  }
}
