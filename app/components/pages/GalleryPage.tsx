import GalleryGrid from '@/components/GalleryGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryPage({ albums, title, subtitle, basePath = '' }: { albums: GalleryAlbum[]; title?: string; subtitle?: string; basePath?: string }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] tracking-wide">{title ?? 'Gallery'}</h1>
        {subtitle && (
          <p className="mt-4 mb-12 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-12" />}
        <GalleryGrid albums={albums} basePath={basePath} />
      </div>
    </section>
  );
}
