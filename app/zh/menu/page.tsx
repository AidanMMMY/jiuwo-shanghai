import MenuPage from '@/app/components/pages/MenuPage';
import { getMenuZh } from '@/lib/data';

export default async function Page() {
  const categories = await getMenuZh();
  return <MenuPage categories={categories} title="酒单" subtitle="点击下方分类快速跳转" />;
}
