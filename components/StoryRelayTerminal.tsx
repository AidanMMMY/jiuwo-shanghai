'use client';

import { useState, useCallback } from 'react';
import { StoryRelaySegment } from './StoryRelaySegment';
import { StoryRelayContributors } from './StoryRelayContributors';
import { StoryRelayInput } from './StoryRelayInput';

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
}

interface Contributor {
  name: string;
  segments: number[];
}

interface StoryRelayTerminalProps {
  initialSegments: Segment[];
  initialContributors: Contributor[];
}

export function StoryRelayTerminal({ initialSegments, initialContributors }: StoryRelayTerminalProps) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestSegment = segments[segments.length - 1];
  const latestQuestion = latestSegment
    ? { zh: latestSegment.aiQuestionZh || null, en: latestSegment.aiQuestionEn || null }
    : null;
  const latestSuggestions = latestSegment
    ? [
        { zh: latestSegment.suggestion1Zh || null, en: latestSegment.suggestion1En || null },
        { zh: latestSegment.suggestion2Zh || null, en: latestSegment.suggestion2En || null },
      ]
    : [];

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
      <h1 className="mb-8 text-2xl font-semibold tracking-wide text-[#c9a227]">啾喔故事接力</h1>

      <div className="mb-8">
        {segments.map((segment, idx) => (
          <StoryRelaySegment key={segment.sequence} segment={segment} isLatest={idx === segments.length - 1} />
        ))}
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
      />

      <div className="lg:hidden">
        <StoryRelayContributors contributors={contributors} isMobile />
      </div>
    </div>
  );
}
