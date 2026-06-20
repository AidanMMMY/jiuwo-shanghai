'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { StoryRelaySegment } from './StoryRelaySegment';
import { StoryRelayContributors } from './StoryRelayContributors';
import { StoryRelayInput } from './StoryRelayInput';
import { StoryRelayPendingBlock } from './StoryRelayPendingBlock';

interface Segment {
  sequence: number;
  authorName: string;
  userPrompt?: string | null;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
  suggestion1Zh?: string | null;
  suggestion1En?: string | null;
  suggestion2Zh?: string | null;
  suggestion2En?: string | null;
  suggestion3Zh?: string | null;
  suggestion3En?: string | null;
  summaryZh?: string | null;
  summaryEn?: string | null;
}

interface Contributor {
  name: string;
  segments: number[];
}

interface StoryRelayTerminalProps {
  initialSegments: Segment[];
  initialContributors: Contributor[];
  isZh?: boolean;
  defaultAuthorName?: string;
}

export function StoryRelayTerminal({ initialSegments, initialContributors, isZh, defaultAuthorName }: StoryRelayTerminalProps) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animatingSequence, setAnimatingSequence] = useState<number | null>(null);

  const latestSegment = segments[segments.length - 1];
  const latestQuestion = latestSegment
    ? { zh: latestSegment.aiQuestionZh || null, en: latestSegment.aiQuestionEn || null }
    : null;
  const latestSuggestions = latestSegment
    ? [
        { zh: latestSegment.suggestion1Zh || null, en: latestSegment.suggestion1En || null },
        { zh: latestSegment.suggestion2Zh || null, en: latestSegment.suggestion2En || null },
        { zh: latestSegment.suggestion3Zh || null, en: latestSegment.suggestion3En || null },
      ]
    : [];

  const handleAnimationDone = useCallback(() => {
    setAnimatingSequence(null);
  }, []);

  const handleSubmit = useCallback(
    async (authorName: string, userInput: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/story-relay/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorName, userInput }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '续写失败');
        }
        setSegments((prev) => [...prev, data.segment]);
        setContributors(data.contributors);
        setAnimatingSequence(data.segment.sequence);
      } catch (err) {
        setError(err instanceof Error ? err.message : '续写失败');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-4">
        <Link
          href={isZh ? '/zh' : '/'}
          className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-[#c9a227] transition-colors"
        >
          <span aria-hidden="true">←</span>
          {isZh ? '返回' : 'Back'}
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-wide text-[#c9a227]">
          {isZh ? '啾喔故事接力' : 'Story Relay'}
        </h1>
        <Link
          href={isZh ? '/zh/story-relay/chapters' : '/story-relay/chapters'}
          className="text-sm text-[#888] hover:text-[#c9a227] transition-colors"
        >
          {isZh ? '往期篇章' : 'Past chapters'}
        </Link>
      </div>

      <div className="mb-8">
        {segments.map((segment, idx) => (
          <StoryRelaySegment
            key={segment.sequence}
            segment={segment}
            isZh={isZh}
            animate={segment.sequence === animatingSequence}
            onAnimationDone={idx === segments.length - 1 ? handleAnimationDone : undefined}
          />
        ))}
        {loading && <StoryRelayPendingBlock isZh={isZh} />}
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <StoryRelayInput
        latestQuestion={latestQuestion}
        suggestions={latestSuggestions}
        onSubmit={handleSubmit}
        disabled={loading}
        isZh={isZh}
        defaultName={defaultAuthorName}
      />

      <div className="lg:hidden">
        <StoryRelayContributors contributors={contributors} isMobile isZh={isZh} />
      </div>
    </div>
  );
}
