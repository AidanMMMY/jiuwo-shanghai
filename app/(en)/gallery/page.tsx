import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbums } from '@/lib/data';

export default async function Page() {
  const albums = await getGalleryAlbums();
  return <GalleryPage albums={albums} title="Gallery" />;
}
