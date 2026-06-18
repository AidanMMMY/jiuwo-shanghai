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
      <section className="weather-normal-section relative overflow-hidden px-4 md:px-12 py-20 md:py-28 bg-[#080808]">
        {/* Ambient aurora background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-[15%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.10)_0%,transparent_60%)] blur-[100px]" />
          <div className="absolute top-1/2 right-[15%] translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.06)_0%,transparent_60%)] blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201,162,39,0.4) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Section header */}
          <div className="text-center mb-14 md:mb-18">
            <span className="inline-block text-[10px] tracking-[0.3em] text-[#c9a227]/70 mb-4">
              {isZh ? '过了打烊时间' : 'PAST CLOSING HOURS'}
            </span>
            <h2 className="text-lg md:text-xl text-[#f5f5f0] font-light tracking-wide mb-2">
              {isZh ? '吧台还留着两盏灯' : 'Two lights still on at the bar'}
            </h2>
            <p className="text-xs text-[#a0a0a0]/60 tracking-wide">
              {isZh ? '点击任意一扇门' : 'Click either door'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* AI chat entry */}
            <Link
              href={aiHref}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a227]/25 bg-gradient-to-br from-[#141208] via-[#0f0f0a] to-[#0a0a0a] p-8 md:p-10 transition-all duration-500 hover:border-[#c9a227] hover:shadow-[0_0_80px_rgba(201,162,39,0.18)] hover:-translate-y-1"
            >
              {/* Animated sheen on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a227]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </div>

              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Pulsing corner accent */}
              <div className="absolute top-4 right-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a227] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#c9a227]" />
                </span>
              </div>

              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 text-[10px] tracking-[0.2em] text-[#c9a227] mb-6">
                  {content.ai.eyebrow}
                </span>

                <h3 className="text-2xl md:text-3xl font-medium text-[#f5f5f0] mb-3 transition-colors duration-300 group-hover:text-[#c9a227]"
                  style={{
                    textShadow: '0 0 30px rgba(201,162,39,0.15)',
                  }}
                >
                  {content.ai.headline}
                </h3>
                <p className="text-sm md:text-base text-[#a0a0a0] leading-relaxed mb-8 transition-colors duration-300 group-hover:text-[#a0a0a0]"
                >
                  {content.ai.subline}
                </p>

                <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a227] text-[#0a0a0a] text-xs tracking-[0.15em] font-semibold rounded-full transition-all duration-300 group-hover:bg-[#f5f5f0] group-hover:gap-3 group-hover:shadow-[0_0_30px_rgba(245,245,240,0.25)]"
                >
                  {content.ai.cta}
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Story relay entry */}
            <div className="group relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#0f0f0f] via-[#0a0a0a] to-[#080808] p-8 md:p-10 transition-all duration-500 hover:border-[#c9a227]/30"
            >
              {/* Subtle locked vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#1a1a1a] text-[10px] tracking-[0.2em] text-[#666] mb-6"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {content.story.eyebrow}
                </span>

                <h3 className="text-2xl md:text-3xl font-medium text-[#f5f5f0]/50 mb-3"
                >
                  {content.story.headline}
                </h3>
                <p className="text-sm md:text-base text-[#a0a0a0]/50 leading-relaxed mb-8"
                >
                  {content.story.subline}
                </p>

                <span className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#2a2a2a] rounded-full text-xs tracking-[0.15em] text-[#555]"
                >
                  {isZh ? '即将开放' : 'Coming soon'}
                </span>
              </div>
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
