import Image from 'next/image';
import Link from 'next/link';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryGrid({ albums, basePath = '' }: { albums: GalleryAlbum[]; basePath?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album) => (
        <Link key={album.id} href={`${basePath}/gallery/${album.id}`} className="group block">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={album.cover}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-medium text-[#f5f5f0]">{album.title}</h3>
              {album.subtitle && (
                <p className="text-xs text-[#a0a0a0] mt-1 line-clamp-2">{album.subtitle}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
