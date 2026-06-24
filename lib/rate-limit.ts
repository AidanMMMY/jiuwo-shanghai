import { createHash } from 'crypto';
import { getSql } from './story-relay';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function rateLimitByIp(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const ipHash = createHash('sha256').update(identifier).digest('hex').slice(0, 16);
  const windowIndex = Math.floor(Date.now() / windowMs);
  const sql = getSql();

  const result = await sql`
    INSERT INTO story_relay_rate_limits (ip_hash, window_index, request_count)
    VALUES (${ipHash}, ${windowIndex}, 1)
    ON CONFLICT (ip_hash, window_index) DO UPDATE SET
      request_count = story_relay_rate_limits.request_count + 1,
      updated_at = NOW()
    RETURNING request_count
  `;

  const count = (result.rows[0] as { request_count: number }).request_count;
  const resetAt = (windowIndex + 1) * windowMs;

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
