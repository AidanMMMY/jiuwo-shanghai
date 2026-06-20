// Backfill entity relations from previously processed conversations that contain
// relationship cues. Resets processed_for_memory to FALSE in small batches and
// triggers the /api/darkroom/extract endpoint so the new relation-extraction
// prompt can run over them.
//
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/backfill-darkroom-relations.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

const BASE_URL = process.env.DARKROOM_BASE_URL || 'https://www.jiuwoshanghai.net';
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 20;

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

async function countRemaining(): Promise<number> {
  const zhClause = buildLikeClause('user_message', ZH_KEYWORDS);
  const enClause = buildLikeClause('user_message', EN_KEYWORDS);
  const result = await sql`
    SELECT COUNT(*) as c
    FROM darkroom_conversations
    WHERE processed_for_memory = TRUE
      AND (${sql.unsafe(zhClause)} OR ${sql.unsafe(enClause)})
  `;
  return Number((result.rows[0] as { c: number }).c);
}

async function main() {
  const initialRemaining = await countRemaining();
  console.log(`Conversations with relationship cues: ${initialRemaining}`);

  let totalReset = 0;
  let totalProcessed = 0;
  let round = 0;

  while (true) {
    round++;
    const zhClause = buildLikeClause('user_message', ZH_KEYWORDS);
    const enClause = buildLikeClause('user_message', EN_KEYWORDS);

    const result = await sql`
      SELECT id
      FROM darkroom_conversations
      WHERE processed_for_memory = TRUE
        AND (${sql.unsafe(zhClause)} OR ${sql.unsafe(enClause)})
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (result.rows.length === 0) {
      console.log('No more conversations to process.');
      break;
    }

    const ids = (result.rows as { id: number }[]).map((r) => r.id);
    await sql`
      UPDATE darkroom_conversations
      SET processed_for_memory = FALSE
      WHERE id = ANY(${ids}::int[])
    `;
    totalReset += ids.length;
    console.log(`\nRound ${round}: reset ${ids.length} conversations (total reset: ${totalReset})`);

    console.log(`Calling ${BASE_URL}/api/darkroom/extract ...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let data: { processed?: number; stored?: number; error?: string } = {};
    try {
      const res = await fetch(`${BASE_URL}/api/darkroom/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      data = (await res.json().catch(() => ({}))) as typeof data;
      console.log('Extract response:', res.status, data);
      totalProcessed += data.processed ?? 0;
    } catch (err) {
      clearTimeout(timeout);
      console.error('Extract call failed:', err);
      // Stop to avoid hammering the API
      process.exit(1);
    }

    const relCount = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
    console.log(`Relations in DB: ${(relCount.rows[0] as { c: number }).c}`);

    if (ids.length < BATCH_SIZE) break;
  }

  const finalRemaining = await countRemaining();
  const finalRelCount = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;

  console.log('\n=== Summary ===');
  console.log(`Initial remaining: ${initialRemaining}`);
  console.log(`Total reset: ${totalReset}`);
  console.log(`Total processed (reported by API): ${totalProcessed}`);
  console.log(`Final remaining: ${finalRemaining}`);
  console.log(`Final relations count: ${(finalRelCount.rows[0] as { c: number }).c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
