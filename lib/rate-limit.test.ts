// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { neon } from '@neondatabase/serverless';

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(),
}));

describe('rateLimitByIp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTGRES_URL = 'postgres://mock';
  });

  it('allows requests under limit', async () => {
    const mockSql = vi.fn().mockResolvedValue({ rows: [{ request_count: 1 }] });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { rateLimitByIp } = await import('./rate-limit');
    const result = await rateLimitByIp('1.2.3.4', 10, 60 * 60 * 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('blocks requests over limit', async () => {
    const mockSql = vi.fn().mockResolvedValue({ rows: [{ request_count: 11 }] });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { rateLimitByIp } = await import('./rate-limit');
    const result = await rateLimitByIp('1.2.3.4', 10, 60 * 60 * 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different IPs independently', async () => {
    const counts = new Map<string, number>();
    const mockSql = vi.fn().mockImplementation((_strings: TemplateStringsArray, ...values: unknown[]) => {
      const ipHash = values[0] as string;
      const next = (counts.get(ipHash) || 0) + 1;
      counts.set(ipHash, next);
      return { rows: [{ request_count: next }] };
    });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { rateLimitByIp } = await import('./rate-limit');
    const a = await rateLimitByIp('1.2.3.4', 1, 60 * 60 * 1000);
    const b = await rateLimitByIp('5.6.7.8', 1, 60 * 60 * 1000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it('does not store raw IP in the database', async () => {
    const mockSql = vi.fn().mockResolvedValue({ rows: [{ request_count: 1 }] });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { rateLimitByIp } = await import('./rate-limit');
    await rateLimitByIp('1.2.3.4', 10, 60 * 60 * 1000);
    const values = mockSql.mock.calls[0].slice(1);
    expect(values).not.toContain('1.2.3.4');
  });
});
