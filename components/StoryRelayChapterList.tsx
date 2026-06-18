'use client';

import Link from 'next/link';

interface ChapterSummary {
  id: number;
  chapterNumber: number;
  createdAt: string;
  archivedAt: string;
  segmentCount: number;
  contributorCount: number;
  preview: string;
  lastAuthor: string;
}

interface StoryRelayChapterListProps {
  chapters: ChapterSummary[];
  isZh?: boolean;
}

export function StoryRelayChapterList({ chapters, isZh }: StoryRelayChapterListProps) {
  const t = (en: string, zh: string) => (isZh ? zh : en);
  const basePath = isZh ? '/zh/story-relay/chapters' : '/story-relay/chapters';

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-wide text-[#c9a227]">{t('Past Chapters', '往期篇章')}</h1>
        <Link
          href={isZh ? '/zh/story-relay' : '/story-relay'}
          className="text-sm text-[#888] hover:text-[#c9a227] transition-colors"
        >
          {t('Back to relay', '返回接力')}
        </Link>
      </div>

      {chapters.length === 0 ? (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-8 text-center">
          <p className="text-sm text-[#666]">{t('No archived chapters yet.', '还没有归档的篇章。')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <Link
              key={chapter.chapterNumber}
              href={`${basePath}/${chapter.chapterNumber}`}
              className="group block rounded-lg border border-[#2a2a2a] bg-[#151515] p-5 transition-all duration-300 hover:border-[#c9a227]/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#c9a227]">
                  {t('Chapter', '第')} {chapter.chapterNumber} {t('', '章')}
                </span>
                <span className="text-xs text-[#666]">
                  {chapter.segmentCount} {t('segments', '段')} · {chapter.contributorCount} {t('contributors', '人')}
                </span>
              </div>

              {chapter.preview && (
                <p className="mb-3 text-base leading-relaxed text-[#a0a0a0] group-hover:text-[#c9a227]/80 transition-colors">
                  “{chapter.preview}”
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-[#666]">
                <span>
                  {t('Last by', '最后由')} {chapter.lastAuthor || t('AI', 'AI')}
                </span>
                <span>
                  {new Date(chapter.archivedAt).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
