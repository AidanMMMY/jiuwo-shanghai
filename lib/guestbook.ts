import { neon } from '@neondatabase/serverless';

// Lazy env check — don't break the build if env var is missing in dev
function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

function hasDbUrl(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL);
}

export const ALLOWED_STAMPS = ['monkey', 'pig', 'wolf', 'dog', 'bear'] as const;
export type StampId = (typeof ALLOWED_STAMPS)[number];

export interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  stamp: StampId;
  created_at: string;
}

export interface GuestbookEntryRaw extends GuestbookEntry {
  email: string | null;
  ip_hash: string;
}

export interface GuestbookLabels {
  title: string;
  subtitle: string;
  cta: string;
  countPrefix: string;
  countSuffix: string;
  nameLabel: string;
  messageLabel: string;
  emailLabel: string;
  emailHint: string;
  stampSelectLabel: string;
  submitButton: string;
  rateLimitMessage: string;
  closeButton: string;
  emptyState: string;
}

export interface GuestbookHookLabels {
  countText: string;
  cta: string;
}

// Lazy env checks — don't break the build if vars are missing in dev
function getEnv(name: string): string | undefined {
  try {
    return process.env[name];
  } catch {
    return undefined;
  }
}

export async function hashIp(ip: string): Promise<string> {
  const salt = getEnv('IP_HASH_SALT') || 'default-salt';
  const data = new TextEncoder().encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createEntry({
  name,
  message,
  stamp,
  email,
  ipHash,
}: {
  name: string;
  message: string;
  stamp: StampId;
  email?: string;
  ipHash: string;
}): Promise<GuestbookEntry> {
  const sql = getSql();
  const result = await sql`
    INSERT INTO guestbook_entries (name, message, stamp, email, ip_hash)
    VALUES (${name}, ${message}, ${stamp}, ${email || null}, ${ipHash})
    RETURNING id, name, message, stamp, created_at
  `;
  return result.rows[0] as GuestbookEntry;
}

export async function listEntries(limit?: number): Promise<GuestbookEntry[]> {
  if (!hasDbUrl()) return [];
  const sql = getSql();
  const result = limit
    ? await sql`
        SELECT id, name, message, stamp, created_at
        FROM guestbook_entries
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, name, message, stamp, created_at
        FROM guestbook_entries
        ORDER BY created_at DESC
      `;
  return result.rows as GuestbookEntry[];
}

export async function countEntries(): Promise<number> {
  if (!hasDbUrl()) return 0;
  const sql = getSql();
  const result = await sql`SELECT COUNT(*) as count FROM guestbook_entries`;
  return Number((result.rows[0] as { count: number }).count);
}

export async function recentCountForIp(ipHash: string, minutes: number = 60): Promise<number> {
  const sql = getSql();
  const result = await sql`
    SELECT COUNT(*) as count
    FROM guestbook_entries
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - INTERVAL '1 minute' * ${minutes}
  `;
  return Number((result.rows[0] as { count: number }).count);
}

export async function deleteEntry(id: number): Promise<boolean> {
  const sql = getSql();
  const result = await sql`DELETE FROM guestbook_entries WHERE id = ${id}`;
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function getEntryById(id: number): Promise<GuestbookEntryRaw | null> {
  const sql = getSql();
  const result = await sql`
    SELECT * FROM guestbook_entries WHERE id = ${id}
  `;
  return (result.rows[0] as GuestbookEntryRaw) || null;
}
