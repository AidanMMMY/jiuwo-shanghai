import type { Metadata } from 'next';
import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutDataZh, getAboutDataZhDarkroom } from '@/lib/data';

export const metadata: Metadata = {
  title: '关于我们',
  description:
    'JIUWO 啾喔，上海巨鹿路上一家友好开放的鸡尾酒吧，2022年创立。上海 LGBTQ 社群的温馨聚集地。周二至周日 19:00–02:00 营业。',
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
      '上海巨鹿路上一家友好开放的鸡尾酒吧。上海 LGBTQ 社群的温馨聚集地。自然酒、手工鸡尾酒、岩茶。',
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
    audience: {
      '@type': 'PeopleAudience',
      audienceType: 'LGBTQ+ friendly',
    },
  };
}

export default async function Page() {
  const [about, aboutDarkroom] = await Promise.all([
    getAboutDataZh(),
    getAboutDataZhDarkroom(),
  ]);
  const jsonLd = generateJsonLd(about);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutPage
        about={about}
        aboutDarkroom={aboutDarkroom}
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
