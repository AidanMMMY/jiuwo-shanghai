import { notFound } from 'next/navigation';
import { getSegments, buildContributors } from '@/lib/story-relay';
import { StoryRelayTerminal } from '@/components/StoryRelayTerminal';
import { StoryRelayContributors } from '@/components/StoryRelayContributors';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function StoryRelayPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const expectedToken = process.env.STORY_RELAY_TOKEN || 'jiuwo';

  if (token !== expectedToken) {
    notFound();
  }

  const segments = await getSegments();
  const contributors = buildContributors(segments);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0]">
      <div className="mx-auto flex max-w-6xl gap-8">
        <StoryRelayTerminal
          initialSegments={segments}
          initialContributors={contributors}
          token={token}
        />
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <StoryRelayContributors contributors={contributors} />
        </aside>
      </div>
    </main>
  );
}
