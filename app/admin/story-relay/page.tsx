import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import {
  getSegments,
  getChapters,
  buildContributors,
  archiveCurrentChapter,
  insertSegment,
  getNextSequence,
  getMemoriesForNameExtraction,
  getCharacters,
  deleteAllCharacters,
  upsertCharacter,
} from '@/lib/story-relay';
import { generateStoryOpening, extractNamesFromMemories, extractCharactersFromSegment } from '@/lib/story-relay-ai';

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function StoryRelayAdminPage({ searchParams }: PageProps) {
  const { key } = await searchParams;
  const adminKey = process.env.STORY_RELAY_ADMIN_TOKEN;

  if (!adminKey || key !== adminKey) {
    redirect('/');
  }

  const [segments, chapters, characters] = await Promise.all([getSegments(), getChapters(), getCharacters()]);
  const contributors = buildContributors(segments);
  const latestSegment = segments[segments.length - 1];

  async function handleReset(formData: FormData) {
    'use server';
    const submittedKey = formData.get('adminKey');
    if (!adminKey || submittedKey !== adminKey) return;

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);

    await archiveCurrentChapter();
    await deleteAllCharacters();
    const generated = await generateStoryOpening(names);
    const sequence = await getNextSequence();
    await insertSegment({
      sequence,
      authorName: 'AI',
      userPrompt: null,
      aiQuestionZh: generated.questionZh,
      aiQuestionEn: generated.questionEn,
      storyZh: generated.storyZh,
      storyEn: generated.storyEn,
      suggestion1Zh: generated.suggestion1Zh,
      suggestion1En: generated.suggestion1En,
      suggestion2Zh: generated.suggestion2Zh,
      suggestion2En: generated.suggestion2En,
      suggestion3Zh: generated.suggestion3Zh,
      suggestion3En: generated.suggestion3En,
      summaryZh: null,
      summaryEn: null,
      sessionId: null,
    });

    try {
      const extracted = await extractCharactersFromSegment(generated.storyZh, generated.storyEn, []);
      for (const entry of extracted) {
        await upsertCharacter(entry.name, entry.descriptionZh, entry.descriptionEn, sequence);
      }
    } catch (characterErr) {
      console.error('[admin/story-relay] character extraction failed:', characterErr);
    }

    revalidatePath('/admin/story-relay');
  }

  return (
    <main className="min-h-[100lvh] bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0] md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl">Story Relay Admin</h1>
          <p className="text-xs text-[#a0a0a0]">{new Date().toLocaleString('zh-CN')}</p>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="当前段落" value={segments.length} />
          <StatCard label="贡献者" value={contributors.length} />
          <StatCard label="已归档章节" value={chapters.length} />
          <StatCard label="最新作者" value={latestSegment?.authorName ?? '-'} />
        </div>

        <section className="mb-10 border border-[#c9a22733] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-[#c9a227]">危险操作</h2>
          </div>
          <p className="mb-4 text-sm text-[#a0a0a0]">
            归档当前故事为一个新章节，然后让 AI 生成新的开头。此操作不可撤销。
          </p>
          <form action={handleReset}>
            <input type="hidden" name="adminKey" value={key} />
            <button
              type="submit"
              className="rounded border border-red-800 bg-red-950/30 px-5 py-2 text-sm text-red-200 transition-colors hover:bg-red-900/40"
            >
              归档并生成新开头
            </button>
          </form>
        </section>

        <section className="mb-10 border border-[#c9a22733] p-5">
          <h2 className="mb-5 text-sm uppercase tracking-wider text-[#c9a227]">角色档案</h2>
          {characters.length === 0 ? (
            <p className="text-[#a0a0a0]">暂无角色档案。</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {characters.map((character) => (
                <div key={character.name} className="border border-[#222] p-3">
                  <div className="mb-1 text-sm text-[#f5f5f0]">{character.name}</div>
                  <div className="text-xs text-[#a0a0a0]">首次登场：第 {character.firstSegmentSequence} 段</div>
                  <p className="mt-2 text-xs leading-relaxed text-[#888]">{character.descriptionZh}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10 border border-[#c9a22733] p-5">
          <h2 className="mb-5 text-sm uppercase tracking-wider text-[#c9a227]">当前段落</h2>
          {segments.length === 0 ? (
            <p className="text-[#a0a0a0]">暂无段落。</p>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div
                  key={segment.sequence}
                  className="border-b border-[#222] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="mb-2 flex items-center gap-3 text-xs text-[#a0a0a0]">
                    <span className="text-[#c9a227]">#{segment.sequence}</span>
                    <span>{segment.authorName === 'AI' ? '匿名酒保' : segment.authorName}</span>
                    <span>{new Date(segment.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#f5f5f0]">
                    {segment.storyZh}
                  </p>
                  {segment.summaryZh && (
                    <p className="mt-2 text-xs text-[#666]">
                      <span className="text-[#888]">摘要：</span>
                      {segment.summaryZh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10 border border-[#c9a22733] p-5">
          <h2 className="mb-5 text-sm uppercase tracking-wider text-[#c9a227]">贡献者</h2>
          {contributors.length === 0 ? (
            <p className="text-[#a0a0a0]">暂无贡献者。</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {contributors.map((contributor) => (
                <div key={contributor.name} className="border border-[#222] p-3">
                  <div className="text-sm text-[#f5f5f0]">{contributor.name}</div>
                  <div className="text-xs text-[#a0a0a0]">段 {contributor.segments.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border border-[#c9a22733] p-5">
          <h2 className="mb-5 text-sm uppercase tracking-wider text-[#c9a227]">往期章节</h2>
          {chapters.length === 0 ? (
            <p className="text-[#a0a0a0]">暂无归档章节。</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => {
                const archivedSegments = Array.isArray(chapter.segmentsJson)
                  ? chapter.segmentsJson
                  : [];
                const preview =
                  typeof archivedSegments[0]?.storyZh === 'string'
                    ? archivedSegments[0].storyZh.slice(0, 80)
                    : '';
                return (
                  <div
                    key={chapter.chapterNumber}
                    className="flex flex-col gap-2 border-b border-[#222] pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="mb-1 text-sm text-[#f5f5f0]">
                        第 {chapter.chapterNumber} 章
                        <span className="ml-2 text-xs text-[#a0a0a0]">
                          {archivedSegments.length} 段
                        </span>
                      </div>
                      {preview && (
                        <p className="line-clamp-1 text-xs text-[#666]">{preview}…</p>
                      )}
                    </div>
                    <Link
                      href={`/story-relay/chapters/${chapter.chapterNumber}`}
                      className="text-xs text-[#c9a227] hover:underline"
                    >
                      查看章节
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#c9a22733] p-4">
      <p className="mb-1 text-2xl text-[#f5f5f0]">{value}</p>
      <p className="text-xs uppercase tracking-wider text-[#a0a0a0]">{label}</p>
    </div>
  );
}
