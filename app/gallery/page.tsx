import GalleryGrid from '@/components/GalleryGrid';
import { getGalleryAlbums } from '@/lib/data';

export default async function GalleryPage() {
  const albums = await getGalleryAlbums();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">画册</h1>
        <GalleryGrid albums={albums} />
      </div>
    </section>
  );
}
