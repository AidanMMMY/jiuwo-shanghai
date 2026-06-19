import { neon } from '@neondatabase/serverless';

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.GUESTBOOK_POSTGRES_URL;
if (!url) {
  console.error('No database URL found in environment');
  process.exit(1);
}

const sql = neon(url);

await sql`
  ALTER TABLE story_relay_segments
    ADD COLUMN IF NOT EXISTS suggestion_3_zh TEXT,
    ADD COLUMN IF NOT EXISTS suggestion_3_en TEXT;
`;

console.log('Migration applied: suggestion_3_zh / suggestion_3_en added.');
