import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import { getGalleryAlbum, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album: string }>;
}) {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) notFound();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href="/gallery" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          ← 返回画册
        </Link>
        <h1 className="text-3xl font-medium text-[#f5f5f0] mt-8 mb-12 tracking-wide">{data.title}</h1>
        <AlbumPhotoGrid photos={data.photos} />
      </div>
    </section>
  );
}
