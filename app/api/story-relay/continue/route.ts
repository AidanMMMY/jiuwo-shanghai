import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  getLatestSegment,
  getNextSequence,
  insertSegment,
  buildPublicContributors,
  getMemoriesForNameExtraction,
  getSegments,
  getRecentSummaries,
  updateSegmentSummary,
  getCharacters,
  upsertCharacter,
  sanitizeSegmentForPublic,
} from '@/lib/story-relay';
import {
  generateStoryContinuation,
  extractNamesFromMemories,
  generateSegmentSummary,
  fallbackSegmentSummary,
  extractCharactersFromSegment,
} from '@/lib/story-relay-ai';
import { rateLimitByIp } from '@/lib/rate-limit';

const continueSchema = z.object({
  authorName: z.string().min(1).max(64),
  userInput: z.string().min(1).max(2000),
});

function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelIp) return vercelIp;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',');
  if (forwarded && forwarded.length > 0) return forwarded[forwarded.length - 1].trim();
  return 'anonymous';
}

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get('story_relay_session_id')?.value;
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  cookieStore.set('story_relay_session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return sessionId;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimitByIp(`story-relay-continue:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: '本小时接力次数已达上限，请稍后再试。' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = continueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { authorName, userInput } = parsed.data;

    const sessionId = await getOrCreateSessionId();
    const latest = await getLatestSegment();
    if (!latest) {
      return NextResponse.json({ error: 'No active story' }, { status: 400 });
    }

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);

    const segments = await getSegments();
    const latestQuestion = latest.aiQuestionZh || latest.aiQuestionEn || '';
    const recentSummaries = (await getRecentSummaries(4)).reverse();
    const characters = await getCharacters();
    const characterRoster = characters.map((c) => ({
      name: c.name,
      descriptionZh: c.descriptionZh,
      descriptionEn: c.descriptionEn,
    }));

    const generated = await generateStoryContinuation(
      names,
      segments.length,
      latestQuestion,
      userInput,
      authorName,
      latest.storyZh,
      latest.storyEn,
      recentSummaries,
      characterRoster
    );

    const nextSequence = await getNextSequence();
    const newSegment = await insertSegment({
      sequence: nextSequence,
      authorName,
      userPrompt: userInput,
      aiQuestionZh: generated.questionZh || null,
      aiQuestionEn: generated.questionEn || null,
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
      sessionId,
    });

    try {
      const summary = await generateSegmentSummary(newSegment.storyZh, newSegment.storyEn);
      await updateSegmentSummary(newSegment.id, summary.summaryZh, summary.summaryEn);
    } catch (summaryErr) {
      console.error('[story-relay/continue] summary generation failed, using fallback:', summaryErr);
      const fallback = fallbackSegmentSummary(newSegment.storyZh, newSegment.storyEn);
      try {
        await updateSegmentSummary(newSegment.id, fallback.summaryZh, fallback.summaryEn);
      } catch (updateErr) {
        console.error('[story-relay/continue] fallback summary update failed:', updateErr);
      }
    }

    try {
      const extracted = await extractCharactersFromSegment(
        newSegment.storyZh,
        newSegment.storyEn,
        characterRoster
      );
      for (const entry of extracted) {
        const existing = characters.find((c) => c.name === entry.name);
        await upsertCharacter(
          entry.name,
          entry.descriptionZh,
          entry.descriptionEn,
          existing ? existing.firstSegmentSequence : newSegment.sequence
        );
      }
    } catch (characterErr) {
      console.error('[story-relay/continue] character extraction failed:', characterErr);
    }

    const cookieStore = await cookies();
    cookieStore.set('story_relay_author_name', authorName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    const allSegments = [...segments, { ...newSegment, summaryZh: newSegment.summaryZh, summaryEn: newSegment.summaryEn }];
    return NextResponse.json({
      segment: sanitizeSegmentForPublic(newSegment),
      contributors: buildPublicContributors(allSegments),
    });
  } catch (err) {
    console.error('story-relay/continue error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'DEEPSEEK_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'AI 服务未配置，请联系管理员。' }, { status: 503 });
    }
    if (message === 'AI_TIMEOUT') {
      return NextResponse.json({ error: 'AI 响应超时，请重试。' }, { status: 504 });
    }
    if (message === 'AI_RATE_LIMIT') {
      return NextResponse.json({ error: 'AI 服务繁忙，请稍后再试。' }, { status: 503 });
    }
    if (message.startsWith('CONTENT_BLOCKED')) {
      return NextResponse.json(
        { error: 'AI 觉得这一段写得太直白了，啾喔的故事更喜欢用氛围和隐喻来说。换一种含蓄点的写法？' },
        { status: 400 }
      );
    }
    if (message === 'CONCURRENCY_CONFLICT') {
      return NextResponse.json(
        { error: '有人刚刚接龙了，请刷新后再试' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: '服务器暂时不可用，请刷新页面重试。' }, { status: 500 });
  }
}
