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
      cta: isZh ? '进来 →' : 'Step in →',
    },
    story: {
      eyebrow: isZh ? '公开接龙' : 'OPEN RELAY',
      headline: isZh ? '故事还开着' : 'The story is still open',
      subline: isZh ? '下一句你来写。' : 'You write the next line.',
      cta: isZh ? '接一句 →' : 'Continue →',
    },
  };

  return (
    <>
      <section className="weather-normal-section px-4 md:px-12 pt-20 pb-4 bg-[#080808]">
      <div className="mx-auto max-w-5xl">
        <div className="relative flex flex-col md:flex-row md:items-stretch">
          {/* AI chat entry */}
          <Link
            href={aiHref}
            className="group relative flex-1 px-6 py-10 md:px-10 md:py-14 text-center md:text-left transition-colors duration-300 hover:bg-[#0f0f0f]"
          >
            <span className="inline-block text-[10px] tracking-[0.25em] text-[#c9a227]/70 mb-4">
              {content.ai.eyebrow}
            </span>
            <h2
              className="text-2xl md:text-3xl text-[#f5f5f0] mb-3 tracking-wide"
              style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
            >
              {content.ai.headline}
            </h2>
            <p className="text-sm md:text-base text-[#a0a0a0] italic leading-relaxed mb-6">
              {content.ai.subline}
            </p>
            <span className="inline-flex items-center text-xs tracking-[0.2em] text-[#c9a227] group-hover:text-[#f5f5f0] transition-colors duration-300">
              {content.ai.cta}
            </span>
          </Link>

          {/* Divider */}
          <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-[#333] to-transparent" />
          <div className="md:hidden h-px mx-6 bg-gradient-to-r from-transparent via-[#333] to-transparent" />

          {/* Story relay entry */}
          <div className="group relative flex-1 px-6 py-10 md:px-10 md:py-14 text-center md:text-left transition-colors duration-300 hover:bg-[#0f0f0f]">
            <span className="inline-block text-[10px] tracking-[0.25em] text-[#c9a227]/70 mb-4">
              {content.story.eyebrow}
            </span>
            <h2
              className="text-2xl md:text-3xl text-[#f5f5f0] mb-3 tracking-wide"
              style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
            >
              {content.story.headline}
            </h2>
            <p className="text-sm md:text-base text-[#a0a0a0] italic leading-relaxed mb-6">
              {content.story.subline}
            </p>
            <span className="inline-flex items-center text-xs tracking-[0.2em] text-[#c9a227]/50">
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
