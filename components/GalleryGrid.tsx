import Image from 'next/image';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryGrid({ albums, albumsDarkroom, basePath = '' }: { albums: GalleryAlbum[]; albumsDarkroom?: GalleryAlbum[]; basePath?: string }) {
  const darkroomMap = new Map(albumsDarkroom?.map((a) => [a.id, a]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album, index) => {
        const darkroomAlbum = darkroomMap.get(album.id);
        return (
          <ScrollReveal key={album.id} delay={index * 80} effect={index % 3 === 0 ? 'image' : 'card'}>
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
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-card shadow-card-hover">
                  <Image
                    src={album.cover}
                    alt={album.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover will-change-transform transition-transform duration-500 group-hover:scale-105 active:scale-[0.98]"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-100 transition-opacity duration-500 group-hover:opacity-40" />
                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#f5f5f0] tabular-nums backdrop-blur-sm">
                    {album.photos.length}
                  </div>
                  {/* Category badge */}
                  {album.category && (
                    <div className="absolute top-3 left-3 rounded bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-[#808080] backdrop-blur-sm">
                      {album.category}
                    </div>
                  )}
                  {/* Title overlay */}
                  <div className="absolute right-0 bottom-0 left-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <h3 className="text-lg font-medium text-[#f5f5f0]">
                      <span className="normal-content">{album.title}</span>
                      {darkroomAlbum && (
                        <span className="darkroom-content hidden">{darkroomAlbum.title}</span>
                      )}
                    </h3>
                    {album.subtitle && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#a0a0a0]">
                        <span className="normal-content">{album.subtitle}</span>
                        {darkroomAlbum && (
                          <span className="darkroom-content hidden">{darkroomAlbum.subtitle}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
