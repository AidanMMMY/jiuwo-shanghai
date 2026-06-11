import MenuNav from '@/components/MenuNav';
import MenuSection from '@/components/MenuSection';
import type { MenuCategory } from '@/lib/data';

export default function MenuPage({
  categories,
  title,
  subtitle,
}: {
  categories: MenuCategory[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-[100lvh]">
      <div className="mx-auto px-4 md:px-12">
        <div className="flex items-center gap-6 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide shrink-0">
            {title ?? 'Menu'}
          </h1>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
        </div>
        <p className="text-sm text-[#a0a0a0] mb-8 whitespace-pre-line text-center">
          {subtitle ?? 'Click a category below to jump'}
        </p>
      </div>
      <MenuNav categories={categories} />
      <div className="mx-auto px-4 md:px-12">
        {categories.map((cat) => (
          <MenuSection key={cat.category} category={cat} />
        ))}
      </div>
    </div>
  );
}
