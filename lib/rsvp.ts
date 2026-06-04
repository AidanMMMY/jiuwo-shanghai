import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

// Lazy env check — don't break the build if env var is missing in dev
function getSql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

// Lazy env checks
function getEnv(name: string): string | undefined {
  try {
    return process.env[name];
  } catch {
    return undefined;
  }
}

export function hashIp(ip: string): string {
  const salt = getEnv('IP_HASH_SALT') || 'default-salt';
  return createHash('sha256').update(ip + salt).digest('hex');
}

export interface RsvpEntry {
  id: number;
  name: string;
  event_slug: string;
  created_at: string;
}

export async function ensureRsvpTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS rsvp_entries (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      event_slug VARCHAR(50) NOT NULL DEFAULT 'event-20260605',
      ip_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_rsvp_event_slug ON rsvp_entries(event_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_rsvp_created_at ON rsvp_entries(created_at DESC)`;
}

export async function createRsvpEntry({
  name,
  eventSlug,
  ipHash,
}: {
  name: string;
  eventSlug: string;
  ipHash: string;
}): Promise<RsvpEntry> {
  await ensureRsvpTable();
  const sql = getSql();
  const result = await sql`
    INSERT INTO rsvp_entries (name, event_slug, ip_hash)
    VALUES (${name}, ${eventSlug}, ${ipHash})
    RETURNING id, name, event_slug, created_at
  `;
  return result.rows[0] as RsvpEntry;
}

export async function listRsvpEntries(eventSlug: string): Promise<RsvpEntry[]> {
  await ensureRsvpTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, name, event_slug, created_at
    FROM rsvp_entries
    WHERE event_slug = ${eventSlug}
    ORDER BY created_at DESC
  `;
  return result.rows as RsvpEntry[];
}

export async function recentCountForRsvpIp(ipHash: string, minutes: number = 60): Promise<number> {
  await ensureRsvpTable();
  const sql = getSql();
  const result = await sql`
    SELECT COUNT(*) as count
    FROM rsvp_entries
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - INTERVAL '1 minute' * ${minutes}
  `;
  return Number((result.rows[0] as { count: number }).count);
}
