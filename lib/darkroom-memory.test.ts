import { describe, it, expect } from 'vitest';
import { extractKeywords } from './darkroom-memory';

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
