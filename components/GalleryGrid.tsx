import Image from 'next/image';
import Link from 'next/link';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryGrid({ albums, basePath = '' }: { albums: GalleryAlbum[]; basePath?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album) => (
        <Link key={album.id} href={`${basePath}/gallery/${album.id}`} className="group block">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg border border-white/5 bg-[#1a1a1a] shadow-md transition-transform duration-500 group-hover:translate-x-3 group-hover:translate-y-3"
            />
            <div
              aria-hidden
              className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-white/10 bg-[#262626] shadow-md transition-transform duration-500 group-hover:translate-x-1.5 group-hover:translate-y-1.5"
            />
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={album.cover}
                alt={album.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/10" />
              <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#f5f5f0] tabular-nums backdrop-blur-sm">
                {album.photos.length}
              </div>
              <div className="absolute right-0 bottom-0 left-0 p-4">
                <h3 className="text-lg font-medium text-[#f5f5f0]">{album.title}</h3>
                {album.subtitle && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#a0a0a0]">{album.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
