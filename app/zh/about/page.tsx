import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutDataZh } from '@/lib/data';

export default async function Page() {
  const about = await getAboutDataZh();
  return (
    <AboutPage
      about={about}
      labels={{
        title: '我们',
        subtitle: 'JIUWO · 2022年 · 上海',
        hours: '营业时间',
        address: '地址',
        mapTitle: '地图',
        email: '电子邮箱',
        story: '品牌故事',
      }}
    />
  );
}
