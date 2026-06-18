import Link from 'next/link';
import DarkroomTerminal from './DarkroomTerminal';

interface AfterHoursGatewayProps {
  isZh?: boolean;
}

export default function AfterHoursGateway({ isZh = false }: AfterHoursGatewayProps) {
  const aiHref = isZh ? '/zh/darkroom/chat' : '/darkroom/chat';

  const content = {
    ai: {
      eyebrow: isZh ? '深夜之后' : 'AFTER HOURS',
      headline: isZh ? '我们得聊聊' : 'We need to talk',
      subline: isZh ? '关于你今晚看到的事。' : 'About what you saw tonight.',
      cta: isZh ? '进来聊' : 'Step in',
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
      <section className="weather-normal-section px-4 md:px-12 pt-16 pb-8 md:pt-24 md:pb-12 bg-[#080808]">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="text-center mb-10 md:mb-14">
            <span className="inline-block text-[10px] tracking-[0.3em] text-[#c9a227]/60 mb-3">
              {isZh ? '过了打烊时间' : 'PAST CLOSING HOURS'}
            </span>
            <h2 className="text-sm md:text-base text-[#a0a0a0] font-light tracking-wide">
              {isZh ? '吧台还留着两盏灯' : 'Two lights still on at the bar'}
            </h2>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8">
            {/* AI chat entry */}
            <Link
              href={aiHref}
              className="group relative flex-1 p-6 md:p-8 rounded-lg border border-[#222] bg-[#0a0a0a] text-center md:text-left transition-all duration-300 hover:border-[#c9a227]/50 hover:bg-[#0f0f0f] hover:shadow-[0_0_30px_rgba(201,162,39,0.08)] hover:-translate-y-0.5"
            >
              {/* Active corner marker */}
              <span className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-tr-lg">
                <span className="absolute -top-4 -right-4 w-8 h-8 bg-[#c9a227]/10 rotate-45 group-hover:bg-[#c9a227]/20 transition-colors duration-300" />
              </span>

              <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#c9a227]/70 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227] animate-pulse" />
                {content.ai.eyebrow}
              </span>

              <h3 className="text-xl md:text-2xl text-[#f5f5f0] mb-3 tracking-wide font-medium">
                {content.ai.headline}
              </h3>
              <p className="text-sm text-[#a0a0a0] leading-relaxed mb-8">
                {content.ai.subline}
              </p>

              <span className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#333] rounded text-xs tracking-[0.15em] text-[#c9a227] transition-all duration-300 group-hover:border-[#c9a227] group-hover:bg-[#c9a227]/5 group-hover:text-[#f5f5f0]">
                {content.ai.cta}
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>

            {/* Story relay entry */}
            <div className="group relative flex-1 p-6 md:p-8 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]/60 text-center md:text-left">
              <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#c9a227]/40 mb-5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {content.story.eyebrow}
              </span>

              <h3 className="text-xl md:text-2xl text-[#f5f5f0]/60 mb-3 tracking-wide font-medium">
                {content.story.headline}
              </h3>
              <p className="text-sm text-[#a0a0a0]/60 leading-relaxed mb-8">
                {content.story.subline}
              </p>

              <span className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#222] rounded text-xs tracking-[0.15em] text-[#555]">
                {isZh ? '即将开放' : 'Coming soon'}
              </span>
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
