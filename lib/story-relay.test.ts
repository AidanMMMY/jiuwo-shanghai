import { describe, it, expect, beforeEach, vi } from 'vitest';
import { neon } from '@neondatabase/serverless';

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(),
}));

describe('story-relay data layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock';
  });

  it('getSegments returns rows ordered by sequence', async () => {
    const mockSql = vi.fn().mockResolvedValue({ rows: [{ sequence: 0 }, { sequence: 1 }] });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { getSegments } = await import('./story-relay');
    const result = await getSegments();
    expect(result).toHaveLength(2);
    expect(result[0].sequence).toBe(0);
  });

  it('buildContributors groups segments by author', async () => {
    const { buildContributors } = await import('./story-relay');
    const segments = [
      { sequence: 0, authorName: 'AI', sessionId: 'ai' },
      { sequence: 1, authorName: '小明', sessionId: 's1' },
      { sequence: 2, authorName: '小红', sessionId: 's2' },
      { sequence: 3, authorName: '小明', sessionId: 's1' },
    ];
    const contributors = buildContributors(segments as any);
    expect(contributors).toEqual([
      { name: 'AI', sessionId: 'ai', segments: [0] },
      { name: '小明', sessionId: 's1', segments: [1, 3] },
      { name: '小红', sessionId: 's2', segments: [2] },
    ]);
  });
});
