import Link from 'next/link';
import DarkroomTerminal from './DarkroomTerminal';
import MatrixRain from './MatrixRain';
import StoryFlow from './StoryFlow';

interface AfterHoursGatewayProps {
  isZh?: boolean;
}

export default function AfterHoursGateway({ isZh = false }: AfterHoursGatewayProps) {
  const aiHref = isZh ? '/zh/darkroom/chat' : '/darkroom/chat';
  const storyHref = isZh ? '/zh/story-relay' : '/story-relay';

  const content = {
    ai: {
      tag: isZh ? 'AI' : 'AI',
      title: isZh ? '深夜 AI 对话' : 'After-hours AI chat',
      subline: isZh ? '营业结束后，和这里的 AI 聊聊。' : 'Talk to the bar’s AI after closing.',
    },
    story: {
      tag: isZh ? '接龙' : 'RELAY',
      title: isZh ? '故事接龙' : 'Story relay',
      subline: isZh ? '每人写一句，继续这段故事。' : 'Add one line to the ongoing story.',
    },
  };

  return (
    <>
      <section className="weather-normal-section relative overflow-hidden px-4 md:px-12 py-5 md:py-20 bg-[#080808]">
        {/* Compact ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[320px] rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.05)_0%,transparent_65%)] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          {/* Section header */}
          <div className="text-center mb-3 md:mb-8">
            <span className="inline-block text-[10px] tracking-[0.25em] text-[#c9a227]/50">
              {isZh ? '过了打烊时间' : 'PAST CLOSING HOURS'}
            </span>
          </div>

          {/* Unified feature tray */}
          <div className="rounded-2xl overflow-hidden bg-[#0f0f0f] border border-white/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
            <div className="relative grid grid-cols-1 md:grid-cols-2">
              {/* AI chat row */}
              <Link
                href={aiHref}
                className="group relative flex items-center gap-4 md:gap-5 p-4 md:p-5 overflow-hidden transition-colors duration-300 hover:bg-white/[0.025]"
              >
                {/* Background animation — dimmed on mobile */}
                <div className="absolute inset-0 opacity-[0.78] md:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <MatrixRain />
                </div>

                <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#c9a227]/65">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a227] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#c9a227]" />
                    </span>
                    {content.ai.tag}
                  </span>
                  <h3 className="text-[15px] md:text-xl font-medium text-[#f5f5f0] transition-colors duration-300 group-hover:text-[#c9a227]">
                    {content.ai.title}
                  </h3>
                  <p className="text-xs md:text-sm text-[#a0a0a0] leading-relaxed line-clamp-2 md:line-clamp-none">
                    {content.ai.subline}
                  </p>
                </div>

                {/* Function icon */}
                <span className="relative z-10 flex-shrink-0 inline-flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full border border-white/[0.08] bg-white/[0.025] text-[#c9a227]/70 transition-all duration-300 group-hover:border-[#c9a227]/35 group-hover:text-[#c9a227] group-hover:bg-[#c9a227]/8">
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M7.5 15.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m11.25-3.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H18M3 12c0 4.97 4.03 9 9 9a9.76 9.76 0 003.5-.65L21 21l-1.35-5.5a8.96 8.96 0 001.6-5c0-4.97-4.03-9-9-9s-9 4.03-9 9z" />
                  </svg>
                </span>
              </Link>

              {/* Mobile divider */}
              <div className="md:hidden h-px bg-white/[0.07]" />
              {/* Desktop divider */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.07]" />

              {/* Story relay row */}
              <Link
                href={storyHref}
                className="group relative flex items-center gap-4 md:gap-5 p-4 md:p-5 overflow-hidden transition-colors duration-300 hover:bg-white/[0.025]"
              >
                {/* Background animation — dimmed on mobile */}
                <div className="absolute inset-0 opacity-[0.78] md:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <StoryFlow />
                </div>

                <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#c9a227]/65">
                    <svg className="w-3 h-3 text-[#c9a227]/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    {content.story.tag}
                  </span>
                  <h3 className="text-[15px] md:text-xl font-medium text-[#f5f5f0] transition-colors duration-300 group-hover:text-[#c9a227]">
                    {content.story.title}
                  </h3>
                  <p className="text-xs md:text-sm text-[#a0a0a0] leading-relaxed line-clamp-2 md:line-clamp-none">
                    {content.story.subline}
                  </p>
                </div>

                {/* Function icon */}
                <span className="relative z-10 flex-shrink-0 inline-flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full border border-white/[0.08] bg-white/[0.025] text-[#c9a227]/70 transition-all duration-300 group-hover:border-[#c9a227]/35 group-hover:text-[#c9a227] group-hover:bg-[#c9a227]/8">
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Darkroom mode terminal */}
      <div className="weather-darkroom-section hidden">
        <DarkroomTerminal isZh={isZh} />
      </div>
    </>
  );
}
