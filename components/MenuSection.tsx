import type { MenuCategory } from '@/lib/data';

export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.category} className="mb-16 scroll-mt-32">
      <h2 className="text-2xl font-medium text-[#f5f5f0] mb-8 tracking-wide">{category.category}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {category.items.map((item) => (
          <div key={item.name} className="flex justify-between items-baseline border-b border-[#222] pb-4">
            <div>
              <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
              <p className="text-sm text-[#a0a0a0] mt-1">{item.description}</p>
            </div>
            <span className="text-base font-medium text-[#c9a227] whitespace-nowrap ml-4">¥{item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
