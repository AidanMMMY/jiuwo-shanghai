import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbum, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export default async function Page({ params }: { params: Promise<{ album: string }> }) {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      backHref="/gallery"
      backLabel="← Back to Gallery"
    />
  );
}
