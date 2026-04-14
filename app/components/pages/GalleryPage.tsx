import GalleryGrid from '@/components/GalleryGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryPage({ albums, title, basePath = '' }: { albums: GalleryAlbum[]; title?: string; basePath?: string }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{title ?? 'Gallery'}</h1>
        <GalleryGrid albums={albums} basePath={basePath} />
      </div>
    </section>
  );
}
