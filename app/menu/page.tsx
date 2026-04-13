import MenuNav from '@/components/MenuNav';
import MenuSection from '@/components/MenuSection';
import { getMenu } from '@/lib/data';

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-4 tracking-wide">酒单</h1>
        <p className="text-sm text-[#a0a0a0] mb-8">点击下方分类快速跳转</p>
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
