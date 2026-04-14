import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutDataZh } from '@/lib/data';

export default async function Page() {
  const about = await getAboutDataZh();
  return (
    <AboutPage
      about={about}
      labels={{
        title: '关于我们',
        hours: '营业时间',
        address: '地址',
        mapTitle: '地图',
        phone: '联系电话',
        story: '品牌故事',
      }}
    />
  );
}
