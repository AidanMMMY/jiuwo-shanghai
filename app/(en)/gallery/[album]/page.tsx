import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbum, getGalleryAlbumDarkroom, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ album: string }> }): Promise<Metadata> {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) return {};

  return {
    title: data.title,
    description: data.subtitle,
    alternates: { canonical: `/gallery/${album}` },
    openGraph: {
      title: data.title,
      description: data.subtitle,
      images: data.cover ? [{ url: data.cover, alt: data.title }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ album: string }> }) {
  const { album } = await params;
  const [data, dataDarkroom] = await Promise.all([
    getGalleryAlbum(album),
    getGalleryAlbumDarkroom(album),
  ]);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      albumDarkroom={dataDarkroom}
      backHref="/gallery"
      backLabel="← Back to Gallery"
      locale="en"
    />
  );
}
