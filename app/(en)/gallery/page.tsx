import type { Metadata } from 'next';
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbums } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photo gallery of JIUWO — snapshots of friends, event posters, photography by guests, and the joy of people coming together.',
  alternates: { canonical: '/gallery' },
};

export default async function Page() {
  const albums = await getGalleryAlbums();
  return (
    <GalleryPage
      albums={albums}
      title="Gallery"
      subtitle="Archived frames from the local grid. Entities captured between cycles. Artifacts from nights when the usual rendering rules were suspended. Evidence that something keeps pulling people into this coordinate set."
    />
  );
}
