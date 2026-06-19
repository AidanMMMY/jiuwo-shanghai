import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  getLatestSegment,
  getNextSequence,
  insertSegment,
  buildContributors,
  getMemoriesForNameExtraction,
  getSegments,
  getRecentSummaries,
  updateSegmentSummary,
  type StorySegment,
} from '@/lib/story-relay';
import { generateStoryContinuation, extractNamesFromMemories, generateSegmentSummary } from '@/lib/story-relay-ai';
import { rateLimitByIp } from '@/lib/rate-limit';

const continueSchema = z.object({
  authorName: z.string().min(1).max(64),
  userInput: z.string().min(1).max(2000),
});

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

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return message.includes('unique constraint') || message.includes('23505');
}

async function insertSegmentWithRetry(segment: Omit<StorySegment, 'id' | 'createdAt'>): Promise<StorySegment> {
  try {
    return await insertSegment(segment);
  } catch (err) {
    if (isUniqueViolation(err)) {
      segment.sequence = await getNextSequence();
      try {
        return await insertSegment(segment);
      } catch (err2) {
        if (isUniqueViolation(err2)) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
        throw err2;
      }
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const limit = rateLimitByIp(`story-relay-continue:${ip}`, 10, 60 * 60 * 1000);
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

    const generated = await generateStoryContinuation(
      names,
      segments.length,
      latestQuestion,
      userInput,
      authorName,
      latest.storyZh,
      latest.storyEn,
      recentSummaries
    );

    const nextSequence = await getNextSequence();
    let newSegment = await insertSegmentWithRetry({
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
      newSegment = await updateSegmentSummary(newSegment.id, summary.summaryZh, summary.summaryEn);
    } catch (summaryErr) {
      console.error('[story-relay/continue] summary generation failed:', summaryErr);
    }

    const cookieStore = await cookies();
    cookieStore.set('story_relay_author_name', authorName, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    const allSegments = [...segments, newSegment];
    return NextResponse.json({
      segment: {
        sequence: newSegment.sequence,
        authorName: newSegment.authorName,
        storyZh: newSegment.storyZh,
        storyEn: newSegment.storyEn,
        aiQuestionZh: newSegment.aiQuestionZh,
        aiQuestionEn: newSegment.aiQuestionEn,
        suggestion1Zh: newSegment.suggestion1Zh,
        suggestion1En: newSegment.suggestion1En,
        suggestion2Zh: newSegment.suggestion2Zh,
        suggestion2En: newSegment.suggestion2En,
        suggestion3Zh: newSegment.suggestion3Zh,
        suggestion3En: newSegment.suggestion3En,
        summaryZh: newSegment.summaryZh,
        summaryEn: newSegment.summaryEn,
      },
      contributors: buildContributors(allSegments),
    });
  } catch (err) {
    console.error('story-relay/continue error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
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
    return NextResponse.json({ error: 'AI 走神了，请重试' }, { status: 500 });
  }
}
