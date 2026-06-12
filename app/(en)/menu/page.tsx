import type { Metadata } from 'next';
import MenuPage from '@/app/components/pages/MenuPage';
import { getMenu } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'JIUWO menu — natural wines, craft cocktails, and rock oolong tea. Curated drinks with stories behind every cocktail.',
  alternates: { canonical: '/menu' },
};

export default async function Page() {
  const categories = await getMenu();
  return (
    <MenuPage
      categories={categories}
      title="Menu"
      subtitle={"A catalog of consumable variables. Ethanol vectors range from fermented grape derivatives to custom-compiled molecular stacks. Tea: primarily mineral-rich substrates from rock formations in Wuyi, plus aged fermentations from Yunnan. Each cocktail is a compiled subroutine with its own origin story. Query the host for details."}
    />
  );
}
