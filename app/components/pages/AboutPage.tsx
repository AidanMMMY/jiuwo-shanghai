import type { AboutData } from '@/lib/data';

export default function AboutPage({
  about,
  labels,
}: {
  about: AboutData;
  labels: {
    title: string;
    hours: string;
    address: string;
    mapTitle: string;
    email: string;
    story: string;
  };
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold text-[#f5f5f0] tracking-wide mb-12">{labels.title}</h1>

        <div className="space-y-10">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.story}</h2>
            <div className="space-y-5">
              {about.story.split('\n').map((paragraph, i) => (
                <p key={i} className="text-lg text-[#a0a0a0] leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.hours}</h2>
            <p className="text-lg text-[#f5f5f0]">{about.hours}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.email}</h2>
            <p className="text-lg text-[#f5f5f0]">{about.email}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.address}</h2>
            <p className="text-lg text-[#f5f5f0]">{about.address}</p>
            <div className="mt-4 aspect-video w-full rounded-lg overflow-hidden border border-[#222]">
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
        </div>
      </div>
    </section>
  );
}
