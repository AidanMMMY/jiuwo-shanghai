import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbumsZh } from '@/lib/data';

export default async function Page() {
  const albums = await getGalleryAlbumsZh();
  return <GalleryPage albums={albums} title="画册" basePath="/zh" />;
}
