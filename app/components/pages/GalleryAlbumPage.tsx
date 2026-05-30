import Link from 'next/link';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import FriendSocialBar from '@/components/FriendSocialBar';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryAlbumPage({
  album,
  backHref,
  backLabel,
  locale = 'en',
}: {
  album: GalleryAlbum;
  backHref?: string;
  backLabel?: string;
  locale?: 'en' | 'zh';
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href={backHref ?? '/gallery'} className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          {backLabel ?? '← Back to Gallery'}
        </Link>
        <header className="mt-8">
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide">{album.title}</h1>
          {album.subtitle && (
            <p className="mt-3 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl">{album.subtitle}</p>
          )}
          <FriendSocialBar social={album.friendSocial} locale={locale} />
        </header>
        <div className="mt-12">
          <AlbumPhotoGrid photos={album.photos} />
        </div>
      </div>
    </section>
  );
}
