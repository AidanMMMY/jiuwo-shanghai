import Image from 'next/image';
import ScrollReveal from './ScrollReveal';
import type { MenuCategory } from '@/lib/data';

export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <ScrollReveal>
      <section id={category.category} className="mb-16 scroll-mt-32">
        {/* Category title with gold accent line */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[#c9a227] rounded-full" />
          <h2 className="text-2xl font-medium text-[#a0a0a0] tracking-wide">
            {category.category}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {category.items.map((item, index) => (
            <ScrollReveal key={item.name} delay={index * 60}>
              <div className="flex items-start gap-4 pb-6 mb-6">
                {item.image && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#141414]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105 active:scale-[0.98]"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
                    <span className="text-sm font-medium text-[#c9a227] whitespace-nowrap">
                      CNY {item.price}
                    </span>
                  </div>
                  <p className="text-sm text-[#a0a0a0] mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
