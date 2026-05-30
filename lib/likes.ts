import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

let tableEnsured = false;

export async function ensureLikesTable(): Promise<void> {
  if (tableEnsured) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      target_type VARCHAR(20) NOT NULL,
      target_id VARCHAR(500) NOT NULL,
      ip_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_likes_ip ON likes(ip_hash, target_type, target_id)
  `;
  tableEnsured = true;
}

export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT || 'default-salt';
  const data = new TextEncoder().encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getLikeCount(targetType: string, targetId: string): Promise<number> {
  try {
    const sql = getSql();
    const result = await sql`
      SELECT COUNT(*) as count FROM likes
      WHERE target_type = ${targetType} AND target_id = ${targetId}
    `;
    return Number((result.rows[0] as { count: number }).count);
  } catch {
    return 0;
  }
}

export async function hasLiked(ipHash: string, targetType: string, targetId: string): Promise<boolean> {
  try {
    const sql = getSql();
    const result = await sql`
      SELECT COUNT(*) as count FROM likes
      WHERE ip_hash = ${ipHash} AND target_type = ${targetType} AND target_id = ${targetId}
    `;
    return Number((result.rows[0] as { count: number }).count) > 0;
  } catch {
    return false;
  }
}

export async function toggleLike(
  ipHash: string,
  targetType: string,
  targetId: string
): Promise<{ liked: boolean; count: number }> {
  const sql = getSql();

  const existing = await sql`
    SELECT id FROM likes
    WHERE ip_hash = ${ipHash} AND target_type = ${targetType} AND target_id = ${targetId}
  `;

  if (existing.rows.length > 0) {
    // Unlike
    await sql`
      DELETE FROM likes
      WHERE ip_hash = ${ipHash} AND target_type = ${targetType} AND target_id = ${targetId}
    `;
  } else {
    // Like
    await sql`
      INSERT INTO likes (target_type, target_id, ip_hash)
      VALUES (${targetType}, ${targetId}, ${ipHash})
    `;
  }

  const countResult = await sql`
    SELECT COUNT(*) as count FROM likes
    WHERE target_type = ${targetType} AND target_id = ${targetId}
  `;

  return {
    liked: existing.rows.length === 0,
    count: Number((countResult.rows[0] as { count: number }).count),
  };
}
