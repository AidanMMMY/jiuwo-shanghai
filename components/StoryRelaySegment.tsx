interface Segment {
  sequence: number;
  authorName: string;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
}

export function StoryRelaySegment({ segment, isLatest }: { segment: Segment; isLatest?: boolean }) {
  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5 last:mb-0">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">
        {segment.authorName} {segment.sequence === 0 ? '起头' : '续写'} · 第 {segment.sequence} 段
      </div>
      <p className="mb-4 text-lg leading-relaxed text-[#f5f5f0]">{segment.storyZh}</p>
      <p className="mb-4 text-base leading-relaxed text-[#888]">{segment.storyEn}</p>
      {isLatest && segment.aiQuestionZh && (
        <div className="rounded border border-[#2a2a2a] bg-[#151515] p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">AI 提问</div>
          <p className="mb-2 text-lg text-[#f5f5f0]">{segment.aiQuestionZh}</p>
          <p className="text-base text-[#888]">{segment.aiQuestionEn}</p>
        </div>
      )}
    </div>
  );
}
