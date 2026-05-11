import Image from 'next/image';
import type { MenuCategory } from '@/lib/data';

export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.category} className="mb-16 scroll-mt-32">
      <h2 className="text-2xl font-medium text-[#f5f5f0] mb-8 tracking-wide">{category.category}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {category.items.map((item) => (
          <div key={item.name} className="flex items-center gap-4 border-b border-[#222] pb-4">
            {item.image && (
              <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-[#141414]">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
              <p className="text-sm text-[#a0a0a0] mt-1">{item.description}</p>
            </div>
            <span className="text-base font-medium text-[#c9a227] whitespace-nowrap">CNY {item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
