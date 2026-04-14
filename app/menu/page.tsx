import MenuPage from '@/app/components/pages/MenuPage';
import { getMenu } from '@/lib/data';

export default async function Page() {
  const categories = await getMenu();
  return <MenuPage categories={categories} title="Menu" subtitle="Click a category below to jump" />;
}
