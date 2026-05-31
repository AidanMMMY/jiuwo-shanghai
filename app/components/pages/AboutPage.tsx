import AuroraBackground from '@/components/AuroraBackground';
import ScrollReveal from '@/components/ScrollReveal';
import type { AboutData } from '@/lib/data';

export default function AboutPage({
  about,
  labels,
}: {
  about: AboutData;
  labels: {
    title: string;
    subtitle: string;
    hours: string;
    address: string;
    mapTitle: string;
    email: string;
    story: string;
  };
}) {
  const paragraphs = about.story.split('\n').filter((p) => p.trim().length > 0);
  const [firstParagraph, ...restParagraphs] = paragraphs;
  const firstChar = firstParagraph?.charAt(0) ?? '';
  const firstParagraphRest = firstParagraph?.slice(1) ?? '';

  return (
    <main className="relative bg-[#0a0a0a] min-h-screen">
      <AuroraBackground />

      {/* Hero block */}
      <section className="relative z-10 w-full">
        <div className="flex flex-col items-center justify-center px-6 pt-32 md:pt-40 pb-20 md:pb-24 text-center">
          <h1
            className="text-5xl md:text-7xl font-medium tracking-widest text-[#f5f5f0] uppercase"
            style={{ textShadow: '0 0 40px rgba(201,162,39,0.3), 0 0 80px rgba(201,162,39,0.1)' }}
          >
            {labels.story}
          </h1>
          <p className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-[#c9a227]">
            {labels.subtitle}
          </p>
        </div>
      </section>

      {/* Story block */}
      <section className="relative z-10 px-6 pt-20 md:pt-24 pb-20 md:pb-28">
        <div className="mx-auto max-w-2xl">
          <div className="bg-[#0a0a0a]/60 backdrop-blur-[2px] rounded-lg p-8 md:p-10 space-y-8 text-lg md:text-xl text-[#a0a0a0] leading-relaxed">
            {firstParagraph && (
              <ScrollReveal delay={100}>
                <p>
                  <span
                    className="float-left text-7xl md:text-8xl font-semibold text-[#c9a227] leading-none mr-3 mt-1"
                    style={{ textShadow: '0 0 20px rgba(201,162,39,0.4)' }}
                    aria-hidden="true"
                  >
                    {firstChar}
                  </span>
                  {firstParagraphRest}
                </p>
              </ScrollReveal>
            )}
            {restParagraphs.map((paragraph, i) => (
              <ScrollReveal key={i} delay={(i + 2) * 100}>
                <p>{paragraph}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="relative z-10 px-6 py-12 md:py-16">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center bg-[#0a0a0a]/40 backdrop-blur-[1px] rounded-lg p-8 md:p-10 transition-all duration-300 hover:brightness-110">
            <div className="mx-auto h-px w-12 bg-[#c9a227] mb-8" />
            <p className="text-2xl md:text-3xl italic text-[#f5f5f0] leading-relaxed">
              <span className="text-[#c9a227] mr-1">&ldquo;</span>
              {about.pullQuote.replace(/[\"\"\"\"]/g, '').trim()}
              <span className="text-[#c9a227] ml-1">&rdquo;</span>
            </p>
            <div className="mx-auto h-px w-12 bg-[#c9a227] mt-8" />
          </div>
        </ScrollReveal>
      </section>

      {/* Info block: hours / email / address */}
      <section className="relative z-10 px-6 py-16 md:py-20">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {[
              { label: labels.hours, value: about.hours },
              { label: labels.email, value: about.email, href: `mailto:${about.email}` },
              { label: labels.address, value: about.address },
            ].map((item) => (
              <div
                key={item.label}
                className="group border-l border-[#c9a227] pl-4 transition-all duration-300 hover:border-l-[3px] hover:bg-[#c9a227]/5 hover:pl-5 rounded-r-lg"
              >
                <h3 className="text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">{item.label}</h3>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-base md:text-lg text-[#f5f5f0] hover:text-[#c9a227] transition-colors"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="text-base md:text-lg text-[#f5f5f0]">{item.value}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Map block */}
      <section className="relative z-10 px-6 pb-24">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-[#c9a22733] transition-all duration-300 hover:border-[#c9a22766] hover:shadow-[0_0_20px_rgba(201,162,39,0.1)]">
              <iframe
                src={about.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={labels.mapTitle}
              />
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
