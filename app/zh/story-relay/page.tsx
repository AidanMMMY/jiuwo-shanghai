import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSegments, buildContributors } from '@/lib/story-relay';
import { StoryRelayTerminal } from '@/components/StoryRelayTerminal';
import { StoryRelayContributors } from '@/components/StoryRelayContributors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: '故事接力',
  description: 'JIUWO 啾喔公开故事接力。AI 起头，你来续写。',
  alternates: { canonical: '/zh/story-relay' },
};

export default async function StoryRelayPageZh() {
  const segments = await getSegments();
  const contributors = buildContributors(segments);
  const cookieStore = await cookies();
  const defaultAuthorName = cookieStore.get('story_relay_author_name')?.value ?? '';

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 pt-20 pb-12 text-[#f5f5f0] md:pt-24">
      <div className="mx-auto flex max-w-6xl gap-8">
        <StoryRelayTerminal
          initialSegments={segments}
          initialContributors={contributors}
          isZh={true}
          defaultAuthorName={defaultAuthorName}
        />
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <StoryRelayContributors contributors={contributors} isZh={true} />
        </aside>
      </div>
    </main>
  );
}
