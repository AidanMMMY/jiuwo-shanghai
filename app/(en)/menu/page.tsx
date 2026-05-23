import MenuPage from '@/app/components/pages/MenuPage';
import { getMenu } from '@/lib/data';

export default async function Page() {
  const categories = await getMenu();
  return (
    <MenuPage
      categories={categories}
      title="Menu"
      subtitle={"The wine list covers a good range—whites and reds worth exploring. Our tea selection leans into rock oolongs, pu-erh, and black teas, all sourced with care. As for the cocktails, each one carries a story. Ask us about it when you're here."}
    />
  );
}
