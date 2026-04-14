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
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-4 tracking-wide">{title ?? 'Menu'}</h1>
        <p className="text-sm text-[#a0a0a0] mb-8">{subtitle ?? 'Click a category below to jump'}</p>
      </div>
      <MenuNav categories={categories} />
      <div className="mx-auto max-w-7xl px-6">
        {categories.map((cat) => (
          <MenuSection key={cat.category} category={cat} />
        ))}
      </div>
    </div>
  );
}
