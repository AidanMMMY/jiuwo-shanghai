import GalleryGrid from '@/components/GalleryGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryPage({ albums, title, subtitle, basePath = '' }: { albums: GalleryAlbum[]; title?: string; subtitle?: string; basePath?: string }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
          <h1 className="shrink-0 text-4xl font-semibold text-[#f5f5f0] tracking-wide">{title ?? 'Gallery'}</h1>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
        </div>
        {subtitle && (
          <p className="mb-12 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl mx-auto text-center">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-12" />}
        <GalleryGrid albums={albums} basePath={basePath} />
      </div>
    </section>
  );
}
