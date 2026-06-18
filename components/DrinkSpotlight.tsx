import Image from 'next/image';
import Link from 'next/link';
import type { FeaturedData } from '@/lib/data';

interface DrinkSpotlightProps {
  data: FeaturedData;
  isZh?: boolean;
}

export default function DrinkSpotlight({ data, isZh = false }: DrinkSpotlightProps) {
  const drink = data.current;
  const title = isZh ? data.titleZh : data.titleEn;
  const name = isZh ? drink.nameZh : drink.nameEn;
  const categoryLabel = isZh ? drink.categoryLabelZh : drink.categoryLabelEn;
  const description = isZh ? drink.descriptionZh : drink.descriptionEn;
  const story = isZh ? drink.storyZh : drink.storyEn;
  const ctaText = isZh ? '查看酒单' : 'View on Menu';
  const menuHref = isZh && drink.menuLink
    ? drink.menuLink.replace('/menu', '/zh/menu')
    : (drink.menuLink || '/menu');

  return (
    <section className="bg-[#0a0a0a] py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[3/4] border border-white/5 overflow-hidden">
              <Image
                src={drink.image}
                alt={name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="w-full lg:w-1/2 lg:pl-4">
            <p className="text-xs tracking-[0.2em] text-[#c9a227] uppercase mb-4">
              {title}
            </p>

            <h2 className="font-serif text-4xl md:text-5xl text-[#f5f5f0] leading-tight">
              {isZh ? drink.nameEn : name}
            </h2>

            {isZh && (
              <p className="text-xl md:text-2xl text-[#a0a0a0] mt-2">
                {drink.nameZh}
              </p>
            )}

            <span className="inline-block text-[10px] tracking-[0.15em] border border-[#c9a227]/30 text-[#c9a227] px-3 py-1 mt-4">
              {categoryLabel}
            </span>

            <p className="text-sm md:text-base text-[#d0d0d0] leading-relaxed mt-6">
              {description}
            </p>

            {story && (
              <p className="text-sm text-[#808080] italic mt-4">
                {story}
              </p>
            )}

            <Link
              href={menuHref}
              className="group inline-flex items-center gap-2 text-sm text-[#c9a227] hover:text-[#f5f5f0] transition-colors mt-8"
            >
              {ctaText}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
