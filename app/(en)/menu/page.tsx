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
      subtitle={"The wine list covers a good range—whites and reds worth exploring. Tea selection leans into rock oolongs, pu-erh, and black teas, all sourced with care. As for the cocktails, each one carries a story. Ask us about it when you're here."}
      subtitleDarkroom="A catalog of consumable variables. Ethanol vectors range from fermented grape derivatives to custom-compiled molecular stacks. Tea: primarily mineral-rich substrates from rock formations in Wuyi, plus aged fermentations from Yunnan. Each cocktail is a compiled subroutine with its own origin story. Query the host for details."
    />
  );
}
