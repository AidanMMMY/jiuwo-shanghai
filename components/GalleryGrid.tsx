import Image from 'next/image';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';
import type { GalleryAlbum } from '@/lib/data';

const categoryStyles: Record<string, { labelColor: string; hoverBorder: string }> = {
  'Our Friends': { labelColor: 'text-[#c9a227]', hoverBorder: 'group-hover:border-[#c9a227]/30' },
  'Our Life': { labelColor: 'text-[#8fb8a8]', hoverBorder: 'group-hover:border-[#8fb8a8]/30' },
  'Jiuwo Stories': { labelColor: 'text-[#b8a08f]', hoverBorder: 'group-hover:border-[#b8a08f]/30' },
  'Photography': { labelColor: 'text-[#9fa8b8]', hoverBorder: 'group-hover:border-[#9fa8b8]/30' },
};

export default function GalleryGrid({ albums, basePath = '' }: { albums: GalleryAlbum[]; basePath?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album, index) => {
        const style = categoryStyles[album.category] || { labelColor: 'text-[#a0a0a0]', hoverBorder: '' };
        return (
          <ScrollReveal key={album.id} delay={index * 100} effect={index % 3 === 0 ? 'scale-in' : 'fade-up'}>
            <Link href={`${basePath}/gallery/${album.id}`} className="group block">
              <div className="relative">
                {/* Shadow layers */}
                <div
                  aria-hidden
                  className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg border border-white/5 bg-[#1a1a1a] shadow-md transition-all duration-500 group-hover:translate-x-3 group-hover:translate-y-3"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-white/10 bg-[#262626] shadow-md transition-all duration-500 group-hover:translate-x-1.5 group-hover:translate-y-1.5"
                />
                {/* Main card */}
                <div className={`relative aspect-square overflow-hidden rounded-lg border border-transparent transition-all duration-500 ${style.hoverBorder}`}>
                  <Image
                    src={album.cover}
                    alt={album.title}
                    fill
                    className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105 active:scale-[0.98] active:brightness-110"
                  />
                  <div className="absolute inset-0 bg-black/30 transition-colors duration-500 group-hover:bg-black/10" />
                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#f5f5f0] tabular-nums backdrop-blur-sm transition-all duration-300 group-hover:bg-[#c9a227]/20 group-hover:text-[#c9a227]">
                    {album.photos.length}
                  </div>
                  {/* Category badge */}
                  {album.category && (
                    <div className={`absolute top-3 left-3 rounded bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] backdrop-blur-sm ${style.labelColor}`}>
                      {album.category}
                    </div>
                  )}
                  {/* Title overlay */}
                  <div className="absolute right-0 bottom-0 left-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <h3 className="text-lg font-medium text-[#f5f5f0] transition-colors duration-300 group-hover:text-[#c9a227]">{album.title}</h3>
                    {album.subtitle && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#a0a0a0] transition-colors duration-300 group-hover:text-[#ccc]">{album.subtitle}</p>
                    )}
                  </div>
                  {/* Hover gold border glow */}
                  <div className="absolute inset-0 rounded-lg border border-transparent transition-all duration-500 group-hover:border-[#c9a227]/20 group-hover:shadow-[inset_0_0_30px_rgba(201,162,39,0.05)]" />
                </div>
              </div>
            </Link>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
