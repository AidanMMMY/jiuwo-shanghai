interface StoryRelayPendingBlockProps {
  isZh?: boolean;
}

export function StoryRelayPendingBlock({ isZh }: StoryRelayPendingBlockProps) {
  const label = isZh
    ? '匿名酒保正在接棒 · 下一段'
    : 'The Anonymous Bartender is taking the baton · Next segment';

  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">{label}</div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-[#1c1c1c] [animation-duration:1.6s]" />
        <div className="h-4 w-[92%] animate-pulse rounded bg-[#1c1c1c] [animation-duration:1.6s] [animation-delay:0.2s]" />
        <div className="h-4 w-[78%] animate-pulse rounded bg-[#1c1c1c] [animation-duration:1.6s] [animation-delay:0.4s]" />
      </div>
      <span className="mt-3 inline-block h-[1em] w-[2px] animate-pulse bg-[#c9a227] align-middle" />
    </div>
  );
}
