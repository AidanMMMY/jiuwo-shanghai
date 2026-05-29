import type { Metadata } from 'next';
import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutDataZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '关于我们',
  description:
    'JIUWO 啾喔，上海巨鹿路鸡尾酒吧，2022年创立。周二至周日 19:00–02:00 营业。自然酒、手工鸡尾酒、岩茶。',
  alternates: { canonical: '/zh/about' },
};

function generateJsonLd(about: {
  hours: string;
  address: string;
  email: string;
  heroImage: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name: 'JIUWO',
    alternateName: '啾喔',
    description:
      '上海巨鹿路上的一家鸡尾酒吧。自然酒、手工鸡尾酒、岩茶。温馨舒适的空间。',
    url: 'https://jiuwoshanghai.net',
    image: `https://jiuwoshanghai.net${about.heroImage}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '上海市黄浦区巨鹿路 397 号',
      addressLocality: '上海',
      addressRegion: '上海',
      addressCountry: 'CN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 31.223,
      longitude: 121.455,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '19:00',
        closes: '02:00',
      },
    ],
    priceRange: '$$',
    servesCuisine: ['Cocktails', 'Wine', 'Tea'],
    email: about.email,
    telephone: '+86-21-0000-0000',
    sameAs: ['https://instagram.com/jiuwoshanghai'],
  };
}

export default async function Page() {
  const about = await getAboutDataZh();
  const jsonLd = generateJsonLd(about);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
