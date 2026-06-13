import type { Metadata } from 'next';
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbums, getGalleryAlbumsDarkroom } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photo gallery of JIUWO — snapshots of friends, event posters, photography by guests, and the joy of people coming together.',
  alternates: { canonical: '/gallery' },
};

export default async function Page() {
  const [albums, albumsDarkroom] = await Promise.all([
    getGalleryAlbums(),
    getGalleryAlbumsDarkroom(),
  ]);

  return (
    <GalleryPage
      albums={albums}
      albumsDarkroom={albumsDarkroom}
      title="Gallery"
      subtitle="Here's a gallery of moments we've gathered — snapshots of friends, posters from nights worth remembering, photography by people who've passed through, and the simple, easy joy of people coming together under this roof."
      subtitleDarkroom="Archived frames from the local grid. Entities captured between cycles. Artifacts from nights when the usual rendering rules were suspended. Evidence that something keeps pulling people into this coordinate set."
    />
  );
}
