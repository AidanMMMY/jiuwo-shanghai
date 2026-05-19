import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutData } from '@/lib/data';

export default async function Page() {
  const about = await getAboutData();
  return (
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
  );
}
