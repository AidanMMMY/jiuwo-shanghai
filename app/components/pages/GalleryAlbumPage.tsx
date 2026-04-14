import Link from 'next/link';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryAlbumPage({
  album,
  backHref,
  backLabel,
}: {
  album: GalleryAlbum;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href={backHref ?? '/gallery'} className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          {backLabel ?? '← Back to Gallery'}
        </Link>
        <h1 className="text-3xl font-medium text-[#f5f5f0] mt-8 mb-12 tracking-wide">{album.title}</h1>
        <AlbumPhotoGrid photos={album.photos} />
      </div>
    </section>
  );
}
