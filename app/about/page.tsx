import { getAboutData } from '@/lib/data';

export default async function AboutPage() {
  const about = await getAboutData();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">关于我们</h1>

        <div className="space-y-10">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">营业时间</h2>
            <p className="text-lg text-[#f5f5f0]">{about.hours}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">地址</h2>
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
                title="地图"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">联系电话</h2>
            <p className="text-lg text-[#f5f5f0]">{about.phone}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">品牌故事</h2>
            <p className="text-base text-[#a0a0a0] leading-relaxed">{about.story}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
