import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractKeywords, buildEntityCard } from './darkroom-memory';
import { generateEmbedding } from './darkroom-embedding';

const mockSql = vi.fn();

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockSql),
}));

describe('extractKeywords', () => {
  it('extracts English keywords', () => {
    const result = extractKeywords('I really love the Chungking Express cocktail here');
    expect(result).toContain('chungking');
    expect(result).toContain('express');
    expect(result).toContain('cocktail');
    expect(result).not.toContain('the');
    expect(result).not.toContain('i');
  });

  it('extracts Chinese keywords', () => {
    const result = extractKeywords('我喜欢重庆森林这款鸡尾酒');
    expect(result).toContain('重');
    expect(result).toContain('庆');
    expect(result).toContain('森');
    expect(result).toContain('林');
    expect(result).toContain('鸡');
    expect(result).toContain('尾');
    expect(result).toContain('酒');
  });

  it('handles mixed Chinese and English', () => {
    const result = extractKeywords('Chungking Express 这款鸡尾酒很好喝');
    expect(result).toContain('chungking');
    expect(result).toContain('express');
    expect(result).toContain('鸡');
  });

  it('returns empty for empty input', () => {
    expect(extractKeywords('')).toEqual([]);
  });

  it('deduplicates keywords', () => {
    const result = extractKeywords('cocktail cocktail cocktail');
    expect(result).toEqual(['cocktail']);
  });

  it('limits to 10 keywords', () => {
    const result = extractKeywords(
      'one two three four five six seven eight nine ten eleven twelve'
    );
    expect(result.length).toBe(10);
  });

  it('extracts bilingual keywords from mixed input', () => {
    const result = extractKeywords('我喜欢 cocktail 和 wine');
    expect(result).toContain('喜');
    expect(result).toContain('cocktail');
    expect(result).toContain('wine');
  });

  it('extracts Chinese keywords even from input marked as English context', () => {
    const result = extractKeywords('重庆森林很好喝');
    expect(result).toContain('重');
    expect(result).toContain('庆');
    expect(result).toContain('森');
    expect(result).toContain('林');
  });
});

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('DARKROOM_EMBEDDING_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns null for empty text', async () => {
    expect(await generateEmbedding('   ')).toBeNull();
  });

  it('returns null when API key is dummy', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'dummy-key-for-build');
    expect(await generateEmbedding('hello')).toBeNull();
  });

  it('returns null when no API key is set', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(await generateEmbedding('hello')).toBeNull();
  });

  it('returns embedding array on success', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: Array(1536).fill(0.1), index: 0 }] }),
    } as Response);

    const result = await generateEmbedding('hello world');
    expect(result).toHaveLength(1536);
    expect(result?.[0]).toBe(0.1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns null when API responds with error', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    } as Response);

    expect(await generateEmbedding('hello')).toBeNull();
  });

  it('returns null on abort error', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockImplementationOnce(() => {
      return new Promise((_resolve, reject) => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        setTimeout(() => reject(err), 10);
      });
    });

    expect(await generateEmbedding('hello')).toBeNull();
  });
});

// Entity helpers are tested with a mocked neon client because they hit Postgres.
describe('entity helpers', () => {
  const baseEntity = {
    id: 1,
    name: '小马',
    aliases: ['Phillip'],
    source: 'knowledge_base',
    entity_type: 'person',
    profile: {},
    mention_count: 5,
    first_seen_at: '',
    last_mentioned_at: '',
    created_at: '',
  };

  beforeEach(() => {
    mockSql.mockReset();
    process.env.POSTGRES_URL = 'postgresql://user:pass@localhost/db';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('findEntityByName queries by name and aliases', async () => {
    mockSql.mockResolvedValue({ rows: [baseEntity] });

    const { findEntityByName } = await import('./darkroom-memory');
    const entity = await findEntityByName('Phillip');
    expect(entity?.name).toBe('小马');
    expect(mockSql).toHaveBeenCalled();
  });

  it('upsertEntity merges aliases with existing entity', async () => {
    mockSql.mockImplementation((_strings: TemplateStringsArray | string[], ..._values: unknown[]) => {
      const text = typeof _strings === 'string' ? _strings : _strings.join('?');
      if (text.includes('FROM darkroom_entities') && text.includes('LIMIT 1')) {
        return Promise.resolve({
          rows: [{ ...baseEntity, profile: { is_known_entity: true } }],
        });
      }
      if (text.includes('INSERT INTO darkroom_entities')) {
        return Promise.resolve({
          rows: [
            {
              ...baseEntity,
              aliases: ['Phillip', '马哥'],
              profile: { is_known_entity: true, is_user: false },
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const { upsertEntity } = await import('./darkroom-memory');
    const entity = await upsertEntity('小马', {
      aliases: ['马哥'],
      source: 'knowledge_base',
      profile: { is_user: false },
      bumpMention: false,
    });

    expect(entity?.aliases).toContain('马哥');
    expect(entity?.profile.is_user).toBe(false);
  });

  it('linkMemoryToEntities skips names shorter than 2 chars', async () => {
    const { linkMemoryToEntities } = await import('./darkroom-memory');
    await linkMemoryToEntities(42, ['A', ''], { subjectName: 'A' });
    // The function returns early before any SQL is issued.
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe('buildEntityCard', () => {
  const baseEntity = {
    id: 1,
    name: '小马',
    aliases: ['Phillip'],
    source: 'knowledge_base' as const,
    entity_type: 'person',
    profile: {
      description: '酒吧熟客，常与阿林一起来',
      preferences: ['金汤力', '吧台座位'],
    },
    mention_count: 5,
    first_seen_at: '',
    last_mentioned_at: '',
    created_at: '',
  };

  it('includes identity, relations, preferences and memories', () => {
    const card = buildEntityCard(
      baseEntity,
      true,
      [
        { relation_type: 'partner', other_name: '阿林' },
        { relation_type: 'friend', other_name: 'Dex' },
      ],
      [
        { id: 1, content: '上次和阿林一起来坐在吧台', keywords: [], confidence: 0.8, source_lang: 'zh', created_at: '' },
      ]
    );

    expect(card).toContain('[人物卡：小马]');
    expect(card).toContain('酒吧熟客');
    expect(card).toContain('阿林（partner）');
    expect(card).toContain('金汤力');
    expect(card).toContain('上次和阿林一起来坐在吧台');
  });

  it('renders English card when isZh is false', () => {
    const card = buildEntityCard(
      { ...baseEntity, name: 'Phillip' },
      false,
      [],
      []
    );
    expect(card).toContain('[Person card: Phillip]');
  });

  it('limits displayed relations and memories', () => {
    const relations = Array.from({ length: 5 }, (_, i) => ({
      relation_type: 'friend',
      other_name: `Friend${i}`,
    }));
    const memories = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      content: `memory ${i}`,
      keywords: [],
      confidence: 0.8,
      source_lang: 'zh' as const,
      created_at: '',
    }));

    const card = buildEntityCard(baseEntity, true, relations, memories);
    const relationCount = (card.match(/Friend/g) || []).length;
    const memoryCount = (card.match(/memory /g) || []).length;
    expect(relationCount).toBeLessThanOrEqual(3);
    expect(memoryCount).toBeLessThanOrEqual(3);
  });

  it('shows a fallback identity note for memory-only entities without a description', () => {
    const memoryOnlyEntity = {
      ...baseEntity,
      source: 'user_mentioned' as const,
      profile: {},
      mention_count: 7,
    };
    const card = buildEntityCard(memoryOnlyEntity, true, [], []);
    expect(card).toContain('[人物卡：小马]');
    expect(card).toContain('从 7 条聊天记忆中识别出的人物');
  });
});
