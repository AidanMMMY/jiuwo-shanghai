import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
              <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
