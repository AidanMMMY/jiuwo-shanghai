interface Segment {
  sequence: number;
  authorName: string;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
}

export function StoryRelaySegment({
  segment,
  isLatest,
  isZh,
}: {
  segment: Segment;
  isLatest?: boolean;
  isZh?: boolean;
}) {
  const story = isZh ? segment.storyZh : segment.storyEn;
  const question = isZh ? segment.aiQuestionZh : segment.aiQuestionEn;
  const questionLabel = isZh ? 'AI 提问' : 'AI asks';
  const segmentLabel = isZh
    ? `${segment.authorName} ${segment.sequence === 0 ? '起头' : '续写'} · 第 ${segment.sequence} 段`
    : `${segment.authorName} ${segment.sequence === 0 ? 'opened' : 'continued'} · Segment ${segment.sequence}`;

  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5 last:mb-0">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">{segmentLabel}</div>
      <p className="mb-4 text-lg leading-relaxed text-[#f5f5f0]">{story}</p>
      {isLatest && question && (
        <div className="rounded border border-[#2a2a2a] bg-[#151515] p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">{questionLabel}</div>
          <p className="text-lg text-[#f5f5f0]">{question}</p>
        </div>
      )}
    </div>
  );
}
