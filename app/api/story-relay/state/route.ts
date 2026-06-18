import { NextResponse } from 'next/server';
import { getSegments, buildContributors } from '@/lib/story-relay';

export async function GET() {
  try {
    const segments = await getSegments();
    const contributors = buildContributors(segments);
    const latest = segments[segments.length - 1];

    return NextResponse.json({
      segments: segments.map((s) => ({
        sequence: s.sequence,
        authorName: s.authorName,
        userPrompt: s.userPrompt,
        storyZh: s.storyZh,
        storyEn: s.storyEn,
        aiQuestionZh: s.aiQuestionZh,
        aiQuestionEn: s.aiQuestionEn,
        suggestion1Zh: s.suggestion1Zh,
        suggestion1En: s.suggestion1En,
        suggestion2Zh: s.suggestion2Zh,
        suggestion2En: s.suggestion2En,
      })),
      latestQuestion: latest
        ? { zh: latest.aiQuestionZh, en: latest.aiQuestionEn }
        : null,
      latestSuggestions: latest
        ? [
            { zh: latest.suggestion1Zh, en: latest.suggestion1En },
            { zh: latest.suggestion2Zh, en: latest.suggestion2En },
          ]
        : [],
      contributors,
    });
  } catch (err) {
    console.error('story-relay/state error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
