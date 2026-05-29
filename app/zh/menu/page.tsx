import type { Metadata } from 'next';
import MenuPage from '@/app/components/pages/MenuPage';
import { getMenuZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '酒单',
  description:
    'JIUWO 啾喔酒单——自然酒、手工鸡尾酒、岩茶。每款鸡尾酒背后都有一个故事。',
  alternates: { canonical: '/zh/menu' },
};

export default async function Page() {
  const categories = await getMenuZh();
  return (
    <MenuPage
      categories={categories}
      title="酒单"
      subtitle={"葡萄酒种类不少，白的红的都有，挑起来不会无聊。茶以岩茶、普洱和红茶为主，都是品质不错的。鸡尾酒也很有特色，每款背后都有个故事，喝的时候可以问问看。"}
    />
  );
}
