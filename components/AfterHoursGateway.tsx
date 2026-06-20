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
      eyebrow: isZh ? '深夜之后' : 'AFTER HOURS',
      headline: isZh ? '我们得聊聊' : 'We need to talk',
      subline: isZh ? '关于你今晚看到的事。' : 'About what you saw tonight.',
      cta: isZh ? '进来' : 'Step in',
    },
    story: {
      eyebrow: isZh ? '公开接龙' : 'OPEN RELAY',
      headline: isZh ? '故事还开着' : 'The story is still open',
      subline: isZh ? '下一句你来写。' : 'You write the next line.',
      cta: isZh ? '接一句' : 'Continue',
    },
  };

  return (
    <>
      <section className="weather-normal-section relative overflow-hidden px-4 md:px-12 py-8 md:py-20 bg-[#080808]">
        {/* Compact ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.08)_0%,transparent_65%)] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Section header */}
          <div className="text-center mb-4 md:mb-10">
            <span className="inline-block text-[10px] tracking-[0.3em] text-[#c9a227]/70 mb-1.5 md:mb-2">
              {isZh ? '过了打烊时间' : 'PAST CLOSING HOURS'}
            </span>
            <h2 className="text-sm md:text-lg text-[#f5f5f0] font-light tracking-wide">
              {isZh ? '两盏灯还亮着' : 'Two lights still on'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3 md:gap-5">
            {/* AI chat entry */}
            <Link
              href={aiHref}
              className="group relative overflow-hidden rounded-xl border border-[#c9a227]/30 bg-gradient-to-br from-[#141208] via-[#0e0e0a] to-[#0a0a0a] p-4 md:p-6 transition-all duration-500 hover:border-[#c9a227] hover:shadow-[0_0_50px_rgba(201,162,39,0.15)] hover:-translate-y-0.5"
            >
              {/* Matrix rain background */}
              <MatrixRain />

              {/* Top sheen line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent" />

              {/* Hover sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a227]/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#c9a227]/80"
                  >
                    <span className="relative flex h-2 w-2"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a227] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c9a227]" />
                    </span>
                    {content.ai.eyebrow}
                  </span>
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-[#c9a227]/25 transition-all duration-300 group-hover:text-[#c9a227]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </div>

                <h3 className="text-lg md:text-2xl font-medium text-[#f5f5f0] mb-0.5 md:mb-1.5 transition-colors duration-300 group-hover:text-[#c9a227]"
                >
                  {content.ai.headline}
                </h3>
                <p className="text-xs md:text-sm text-[#a0a0a0] leading-relaxed mb-3 md:mb-5"
                >
                  {content.ai.subline}
                </p>

                <span className="mt-auto inline-flex items-center gap-1.5 md:gap-2 self-start px-3 py-1.5 md:px-5 md:py-2 border border-[#c9a227]/40 md:border-transparent bg-transparent md:bg-[#c9a227] text-[#c9a227] md:text-[#0a0a0a] text-[10px] md:text-xs tracking-[0.12em] font-semibold rounded-full transition-all duration-300 group-hover:border-[#c9a227] group-hover:text-[#c9a227] md:group-hover:bg-[#f5f5f0] md:group-hover:text-[#0a0a0a] md:group-hover:gap-3 md:group-hover:shadow-[0_0_20px_rgba(245,245,240,0.2)]"
                >
                  {content.ai.cta}
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Story relay entry */}
            <Link
              href={storyHref}
              className="group relative overflow-hidden rounded-xl border border-[#c9a227]/15 bg-gradient-to-br from-[#1a160c] via-[#0f0d08] to-[#080808] p-4 md:p-6 transition-all duration-500 hover:border-[#c9a227]/40 hover:shadow-[0_0_50px_rgba(201,162,39,0.12)] hover:-translate-y-0.5"
            >
              {/* Abstract living forms background */}
              <StoryFlow />

              {/* Warm ambient base glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 60%, rgba(201,162,39,0.10) 0%, rgba(201,162,39,0.04) 35%, transparent 70%)',
                }}
              />

              {/* Top sheen line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />

              {/* Hover sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a227]/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#c9a227]/80"
                  >
                    <svg className="w-3 h-3 text-[#c9a227]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    {content.story.eyebrow}
                  </span>
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 text-[#c9a227]/25 transition-all duration-300 group-hover:text-[#c9a227]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </div>

                <h3 className="text-lg md:text-2xl font-medium text-[#f5f5f0] mb-0.5 md:mb-1.5 transition-colors duration-300 group-hover:text-[#c9a227]"
                >
                  {content.story.headline}
                </h3>
                <p className="text-xs md:text-sm text-[#a0a0a0] leading-relaxed mb-3 md:mb-5"
                >
                  {content.story.subline}
                </p>

                <span className="mt-auto inline-flex items-center gap-1.5 md:gap-2 self-start px-3 py-1.5 md:px-5 md:py-2 border border-[#c9a227]/40 md:border-transparent bg-transparent md:bg-[#c9a227] text-[#c9a227] md:text-[#0a0a0a] text-[10px] md:text-xs tracking-[0.12em] font-semibold rounded-full transition-all duration-300 group-hover:border-[#c9a227] group-hover:text-[#c9a227] md:group-hover:bg-[#f5f5f0] md:group-hover:text-[#0a0a0a] md:group-hover:gap-3 md:group-hover:shadow-[0_0_20px_rgba(245,245,240,0.2)]"
                >
                  {content.story.cta}
                  <svg
                    className="w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
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
