import type { Metadata } from 'next';
import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'About',
  description:
    'JIUWO is a cocktail bar on Julu Road, Shanghai, founded in August 2022. Open Tue–Sun 7pm–2am. Natural wines, craft cocktails, and rock oolong tea.',
  alternates: { canonical: '/about' },
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
      'A queer-friendly cocktail bar on Julu Road, Shanghai. Natural wines, craft cocktails, and rock oolong tea in a warm, intimate space.',
    url: 'https://jiuwoshanghai.net',
    image: `https://jiuwoshanghai.net${about.heroImage}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '397 Julu Road',
      addressLocality: 'Shanghai',
      addressRegion: 'Shanghai',
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
  const about = await getAboutData();
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
          title: 'About Us',
          subtitle: 'JIUWO · Since 2022 · Shanghai',
          hours: 'Hours',
          address: 'Address',
          mapTitle: 'Map',
          email: 'E-Mail',
          story: 'Our Story',
        }}
      />
    </>
  );
}
