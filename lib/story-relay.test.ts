// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { safeJsonParse, extractNamesFromMemories, OPENING_PROMPT } from './story-relay-ai';

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
    const segments: { sequence: number; authorName: string; sessionId: string }[] = [
      { sequence: 0, authorName: 'AI', sessionId: 'ai' },
      { sequence: 1, authorName: '小明', sessionId: 's1' },
      { sequence: 2, authorName: '小红', sessionId: 's2' },
      { sequence: 3, authorName: '小明', sessionId: 's1' },
    ];
    const contributors = buildContributors(segments as unknown as import('./story-relay').StorySegment[]);
    expect(contributors).toEqual([
      { name: 'AI', sessionId: 'ai', segments: [0] },
      { name: '小明', sessionId: 's1', segments: [1, 3] },
      { name: '小红', sessionId: 's2', segments: [2] },
    ]);
  });
});

describe('story-relay-ai', () => {
  it('safeJsonParse extracts JSON from markdown fences', () => {
    const raw = '```json\n{"storyZh":"中文","storyEn":"en"}\n```';
    const parsed = safeJsonParse(raw);
    expect(parsed).toEqual({ storyZh: '中文', storyEn: 'en' });
  });

  it('extractNamesFromMemories returns unique names', () => {
    const memories = [
      { content: '小明和老王常来喝酒', confidence: 0.8 },
      { content: 'Leo 喜欢坐吧台', confidence: 0.9 },
      { content: '今天天气不错', confidence: 0.7 },
    ];
    const names = extractNamesFromMemories(memories, ['保底']);
    expect(names).toContain('小明');
    expect(names).toContain('老王');
    expect(names).toContain('Leo');
    expect(names).toContain('保底');
  });

  it('OPENING_PROMPT contains required keys', () => {
    expect(OPENING_PROMPT).toContain('storyZh');
    expect(OPENING_PROMPT).toContain('suggestion1Zh');
  });
});
