import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbumZh, getGalleryAlbumsZh } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbumsZh();
  return albums.map((album) => ({ album: album.id }));
}

export default async function Page({ params }: { params: Promise<{ album: string }> }) {
  const { album } = await params;
  const data = await getGalleryAlbumZh(album);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      backHref="/zh/gallery"
      backLabel="← 返回画册"
    />
  );
}
