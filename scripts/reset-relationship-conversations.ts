// One-shot reset of relationship-related conversations to unprocessed.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/reset-relationship-conversations.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

const ZH_KEYWORDS = [
  '前任', '现任', '男友', '女友', '在一起', '分手', '约会', '暧昧',
  '喜欢', '恋人', '情侣', '老公', '老婆', '关系', '睡过', '上床',
];
const EN_KEYWORDS = [
  'ex', 'boyfriend', 'girlfriend', 'dating', 'date', 'together',
  'broke up', 'relationship', 'sleep with', 'hooked up', 'partner',
];

function buildLikeClause(column: string, keywords: string[]): string {
  return keywords.map((k) => `${column} ILIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
}

async function main() {
  const zhClause = buildLikeClause('user_message', ZH_KEYWORDS);
  const enClause = buildLikeClause('user_message', EN_KEYWORDS);

  const before = await sql`
    SELECT COUNT(*) as c FROM darkroom_conversations WHERE processed_for_memory = FALSE
  `;
  console.log(`Unprocessed before reset: ${(before.rows[0] as { c: number }).c}`);

  const result = await sql`
    UPDATE darkroom_conversations
    SET processed_for_memory = FALSE
    WHERE processed_for_memory = TRUE
      AND (${sql.unsafe(zhClause)} OR ${sql.unsafe(enClause)})
    RETURNING id
  `;

  console.log(`Reset ${result.rows.length} conversations to unprocessed`);

  const after = await sql`
    SELECT COUNT(*) as c FROM darkroom_conversations WHERE processed_for_memory = FALSE
  `;
  console.log(`Unprocessed after reset: ${(after.rows[0] as { c: number }).c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
