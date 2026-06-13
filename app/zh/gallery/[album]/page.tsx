import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbumZh, getGalleryAlbumZhDarkroom, getGalleryAlbumsZh } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbumsZh();
  return albums.map((album) => ({ album: album.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ album: string }> }): Promise<Metadata> {
  const { album } = await params;
  const data = await getGalleryAlbumZh(album);
  if (!data) return {};

  return {
    title: data.title,
    description: data.subtitle,
    alternates: { canonical: `/zh/gallery/${album}` },
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
    getGalleryAlbumZh(album),
    getGalleryAlbumZhDarkroom(album),
  ]);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      albumDarkroom={dataDarkroom}
      backHref="/zh/gallery"
      backLabel="← 返回画册"
      locale="zh"
    />
  );
}
