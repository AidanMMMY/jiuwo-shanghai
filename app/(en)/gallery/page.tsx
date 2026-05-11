import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbums } from '@/lib/data';

export default async function Page() {
  const albums = await getGalleryAlbums();
  return (
    <GalleryPage
      albums={albums}
      title="Gallery"
      subtitle="Here's a gallery of moments we've gathered — snapshots of friends, posters from nights worth remembering, photography by people who've passed through, and the simple, easy joy of people coming together under this roof."
    />
  );
}
