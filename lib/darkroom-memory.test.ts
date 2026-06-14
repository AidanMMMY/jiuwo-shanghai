import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractKeywords } from './darkroom-memory';
import { generateEmbedding } from './darkroom-embedding';

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
