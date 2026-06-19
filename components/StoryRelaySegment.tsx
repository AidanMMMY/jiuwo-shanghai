import { TypewriterText } from './TypewriterText';

interface Segment {
  sequence: number;
  authorName: string;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
}

function getDisplayName(authorName: string, isZh?: boolean): string {
  if (authorName === 'AI') return isZh ? '匿名酒保' : 'The Anonymous Bartender';
  return authorName;
}

export function StoryRelaySegment({
  segment,
  isZh,
  animate,
  onAnimationDone,
}: {
  segment: Segment;
  isZh?: boolean;
  animate?: boolean;
  onAnimationDone?: () => void;
}) {
  const story = isZh ? segment.storyZh : segment.storyEn;
  const displayName = getDisplayName(segment.authorName, isZh);
  const segmentLabel = isZh
    ? `${displayName} ${segment.sequence === 0 ? '起头' : '接棒'} · 第 ${segment.sequence} 段`
    : `${displayName} ${segment.sequence === 0 ? 'opened' : 'took the baton'} · Segment ${segment.sequence}`;

  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5 last:mb-0">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">{segmentLabel}</div>
      {story.split(/\n+/).map((paragraph, i, arr) => {
        const isLastParagraph = i === arr.length - 1;
        return paragraph.trim() ? (
          <p key={i} className="mb-4 text-lg leading-relaxed text-[#d4d4d4] last:mb-0">
            <TypewriterText
              text={paragraph.trim()}
              enabled={animate}
              speedMs={28}
              onDone={isLastParagraph ? onAnimationDone : undefined}
            />
          </p>
        ) : null;
      })}
    </div>
  );
}
