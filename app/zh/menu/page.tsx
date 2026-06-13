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
      subtitleDarkroom="一份可消费变量目录。乙醇载体涵盖发酵葡萄衍生物到定制编译的分子堆栈。茶：主要是武夷岩层中富含矿物质的基底，以及云南的陈年发酵产物。每款鸡尾酒都是一个带有自身起源故事的编译子程序。详情请向宿主查询。"
    />
  );
}
