import GalleryGrid from '@/components/GalleryGrid';
import MistBackground from '@/components/MistBackground';
import type { GalleryAlbum } from '@/lib/data';

const categoryRank: Record<string, number> = {
  'Our Friends': 1,
  '我们的朋友': 1,
  'Our Life': 2,
  '我们的生活': 2,
  'Jiuwo Stories': 3,
  '啾喔的故事': 3,
  'Photography': 4,
  '摄影作品': 4,
};

export default function GalleryPage({
  albums,
  title,
  subtitle,
  basePath = '',
}: {
  albums: GalleryAlbum[];
  title?: string;
  subtitle?: string;
  basePath?: string;
}) {
  // Group albums by category, preserving order within each group
  const grouped = albums.reduce((acc, album) => {
    const cat = album.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(album);
    return acc;
  }, {} as Record<string, GalleryAlbum[]>);

  // Sort categories by fixed order
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (categoryRank[a] || 99) - (categoryRank[b] || 99)
  );

  return (
    <section className="relative pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <MistBackground />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
          <h1 className="shrink-0 text-4xl font-semibold text-[#f5f5f0] tracking-wide">{title ?? 'Gallery'}</h1>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
        </div>
        {subtitle && (
          <p className="mb-12 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl mx-auto text-center">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-12" />}

        {/* Grouped albums */}
        <div className="space-y-16">
          {sortedCategories.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#c9a227]">{cat}</h2>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
              </div>
              <GalleryGrid albums={grouped[cat]} basePath={basePath} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
