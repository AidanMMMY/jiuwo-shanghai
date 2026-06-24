import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  archiveAndInsertOpening,
  getMemoriesForNameExtraction,
  upsertCharacter,
  sanitizeSegmentForPublic,
} from '@/lib/story-relay';
import { generateStoryOpening, extractNamesFromMemories, extractCharactersFromSegment } from '@/lib/story-relay-ai';

const resetSchema = z.object({
  token: z.string().optional(),
});

const STORY_RELAY_ADMIN_TOKEN = process.env.STORY_RELAY_ADMIN_TOKEN;

async function getAdminToken(req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('story_relay_admin_token')?.value;
  if (cookieToken) return cookieToken;

  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    return parsed.success && parsed.data.token ? parsed.data.token : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!STORY_RELAY_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Admin token not configured' }, { status: 503 });
    }

    const token = await getAdminToken(req);
    if (!token || token !== STORY_RELAY_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);
    const generated = await generateStoryOpening(names);

    const { chapter, segment } = await archiveAndInsertOpening({
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

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        createdAt: chapter.createdAt,
        archivedAt: chapter.archivedAt,
      },
      segment: sanitizeSegmentForPublic(segment),
    });
  } catch (err) {
    console.error('story-relay/reset error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'DEEPSEEK_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 503 });
    }
    if (message === 'AI_TIMEOUT') {
      return NextResponse.json({ error: 'AI 响应超时，请重试' }, { status: 504 });
    }
    if (message === 'AI_RATE_LIMIT') {
      return NextResponse.json({ error: 'AI 服务繁忙，请稍后再试' }, { status: 503 });
    }
    if (message.startsWith('CONTENT_BLOCKED')) {
      return NextResponse.json({ error: '生成的开头包含敏感内容，请重试' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to reset story' }, { status: 500 });
  }
}
