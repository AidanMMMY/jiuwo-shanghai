'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface Segment {
  sequence: number;
  authorName: string;
  storyZh: string;
  storyEn: string;
}

interface StoryRelayChapterDetailProps {
  chapter: {
    id: number;
    chapterNumber: number;
    createdAt: string;
    archivedAt: string;
    segments: Segment[];
  };
  isZh?: boolean;
}

export function StoryRelayChapterDetail({ chapter, isZh }: StoryRelayChapterDetailProps) {
  const t = (en: string, zh: string) => (isZh ? zh : en);
  const listPath = isZh ? '/zh/story-relay/chapters' : '/story-relay/chapters';
  const relayPath = isZh ? '/zh/story-relay' : '/story-relay';
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = isZh ? `啾喔故事接力 第 ${chapter.chapterNumber} 章` : `JIUWO Story Relay Chapter ${chapter.chapterNumber}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or share failed
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  }, [chapter.chapterNumber, isZh]);

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#c9a227]">
            {t('Chapter', '第')} {chapter.chapterNumber} {t('', '章')}
          </span>
          <h1 className="mt-1 text-2xl font-semibold tracking-wide text-[#f5f5f0]">{t('Archived Story', '归档故事')}</h1>
        </div>
        <Link
          href={listPath}
          className="text-sm text-[#888] hover:text-[#c9a227] transition-colors"
        >
          {t('All chapters', '全部篇章')}
        </Link>
      </div>

      <div className="mb-10 space-y-8">
        {chapter.segments.map((segment) => (
          <div key={segment.sequence} className="border-l-2 border-[#2a2a2a] pl-5">
            <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">
              {segment.authorName} {segment.sequence === 0 ? t('opened', '起头') : t('continued', '续写')} · {t('Segment', '段')} {segment.sequence}
            </div>
            <p className="mb-4 text-lg leading-relaxed text-[#f5f5f0]">{segment.storyZh}</p>
            <p className="text-base leading-relaxed text-[#888]">{segment.storyEn}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-[#2a2a2a] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={relayPath}
          className="text-sm text-[#c9a227] hover:text-[#f5f5f0] transition-colors"
        >
          {t('Continue the current story →', '继续当前故事 →')}
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleShare}
            className="text-xs uppercase tracking-widest text-[#888] hover:text-[#c9a227] transition-colors"
          >
            {copied ? (isZh ? '已复制链接' : 'Link copied') : t('Share', '分享')}
          </button>
          <span className="text-xs text-[#666]">
            {t('Archived', '归档于')}{' '}
            {new Date(chapter.archivedAt).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
