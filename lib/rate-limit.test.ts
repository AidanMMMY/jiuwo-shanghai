import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimitByIp } from './rate-limit';

describe('rateLimitByIp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimitByIp('ip-a', 5, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it('blocks requests over the limit within the window', () => {
    for (let i = 0; i < 5; i++) {
      rateLimitByIp('ip-b', 5, 60_000);
    }
    const result = rateLimitByIp('ip-b', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    for (let i = 0; i < 5; i++) {
      rateLimitByIp('ip-c', 5, 60_000);
    }
    vi.advanceTimersByTime(60_001);
    const result = rateLimitByIp('ip-c', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks different identifiers independently', () => {
    rateLimitByIp('ip-x', 2, 60_000);
    rateLimitByIp('ip-x', 2, 60_000);
    const result = rateLimitByIp('ip-y', 2, 60_000);
    expect(result.allowed).toBe(true);
  });
});
