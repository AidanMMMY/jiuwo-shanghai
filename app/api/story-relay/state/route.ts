import { NextResponse } from 'next/server';
import { getSegments, buildPublicContributors, sanitizeSegmentForPublic } from '@/lib/story-relay';

export async function GET() {
  try {
    const segments = await getSegments();
    const contributors = buildPublicContributors(segments);
    const latest = segments[segments.length - 1];

    return NextResponse.json({
      segments: segments.map((s) => sanitizeSegmentForPublic(s)),
      latestQuestion: latest
        ? { zh: latest.aiQuestionZh, en: latest.aiQuestionEn }
        : null,
      latestSuggestions: latest
        ? [
            { zh: latest.suggestion1Zh, en: latest.suggestion1En },
            { zh: latest.suggestion2Zh, en: latest.suggestion2En },
            { zh: latest.suggestion3Zh, en: latest.suggestion3En },
          ]
        : [],
      contributors,
    });
  } catch (err) {
    console.error('story-relay/state error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
