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
  isZh,
}: {
  segment: Segment;
  isZh?: boolean;
}) {
  const story = isZh ? segment.storyZh : segment.storyEn;
  const segmentLabel = isZh
    ? `${segment.authorName} ${segment.sequence === 0 ? '起头' : '续写'} · 第 ${segment.sequence} 段`
    : `${segment.authorName} ${segment.sequence === 0 ? 'opened' : 'continued'} · Segment ${segment.sequence}`;

  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5 last:mb-0">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">{segmentLabel}</div>
      {story.split(/\n+/).map((paragraph, i) =>
        paragraph.trim() ? (
          <p key={i} className="mb-4 text-lg leading-relaxed text-[#f5f5f0] last:mb-0">
            {paragraph.trim()}
          </p>
        ) : null
      )}
    </div>
  );
}
