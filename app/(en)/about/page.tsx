import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutData } from '@/lib/data';

export default async function Page() {
  const about = await getAboutData();
  return (
    <AboutPage
      about={about}
      labels={{
        title: 'About Us',
        hours: 'Hours',
        address: 'Address',
        mapTitle: 'Map',
        phone: 'Phone',
        story: 'Our Story',
      }}
    />
  );
}
