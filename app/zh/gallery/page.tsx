import type { Metadata } from 'next';
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbumsZh, getGalleryAlbumsZhDarkroom } from '@/lib/data';

export const metadata: Metadata = {
  title: '画册',
  description:
    'JIUWO 啾喔画册——朋友的相册、活动海报、摄影作品，以及大家在这间屋子里相聚的快乐瞬间。',
  alternates: { canonical: '/zh/gallery' },
};

export default async function Page() {
  const [albums, albumsDarkroom] = await Promise.all([
    getGalleryAlbumsZh(),
    getGalleryAlbumsZhDarkroom(),
  ]);

  return (
    <GalleryPage
      albums={albums}
      albumsDarkroom={albumsDarkroom}
      title="画册"
      subtitle="一些攒下来的瞬间——朋友的相册、摄影集、活动海报、随手拍，以及大家在这间屋子里相聚时，那种不费力的快乐。"
      subtitleDarkroom="本地网格的存档帧。在周期之间捕获的实体。那些常规渲染规则被暂停的夜晚留下的遗物。某种东西不断将人们拉入这个坐标集的证据。"
      basePath="/zh"
    />
  );
}
