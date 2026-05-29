import type { Metadata } from 'next';
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbumsZh } from '@/lib/data';

export const metadata: Metadata = {
  title: '画册',
  description:
    'JIUWO 啾喔画册——朋友的相册、活动海报、摄影作品，以及大家在这间屋子里相聚的快乐瞬间。',
  alternates: { canonical: '/zh/gallery' },
};

export default async function Page() {
  const albums = await getGalleryAlbumsZh();
  return (
    <GalleryPage
      albums={albums}
      title="画册"
      subtitle="一些攒下来的瞬间——朋友的相册、摄影集、活动海报、随手拍，以及大家在这间屋子里相聚时，那种不费力的快乐。"
      basePath="/zh"
    />
  );
}
