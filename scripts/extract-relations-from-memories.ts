// Extract relations from existing memory records that contain relationship cues.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/extract-relations-from-memories.ts

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

const ZH_KEYWORDS = [
  '前任', '现任', '男友', '女友', '在一起', '分手', '约会', '暧昧',
  '喜欢', '恋人', '情侣', '老公', '老婆', '关系', '睡过', '上床',
  '炮友', 'fwb', '热恋', '出轨', '劈腿', '三角恋', '一夜情', '前男友', '前女友',
];
const EN_KEYWORDS = [
  'ex', 'boyfriend', 'girlfriend', 'dating', 'date', 'together',
  'broke up', 'relationship', 'sleep with', 'hooked up', 'partner',
  'affair', 'cheated', 'love triangle', 'one night stand',
];

function buildLikeClause(column: string, keywords: string[]): string {
  return keywords.map((k) => `${column} ILIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
}

async function main() {
  const zhClause = buildLikeClause('content', ZH_KEYWORDS);
  const enClause = buildLikeClause('content', EN_KEYWORDS);

  const result = await sql`
    SELECT id, content, source_lang
    FROM darkroom_memories
    WHERE (${sql.unsafe(zhClause)} OR ${sql.unsafe(enClause)})
    ORDER BY id ASC
  `;

  console.log(`Found ${result.rows.length} memories with relation cues`);

  let totalRecorded = 0;
  let totalSkipped = 0;

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i] as { id: number; content: string; source_lang: string };
    const isZh = row.source_lang === 'zh';

    process.stdout.write(`[${i + 1}/${result.rows.length}] memory ${row.id} ... `);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${BASE_URL}/api/darkroom/extract-relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: row.id, isZh }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await res.json().catch(() => ({}))) as {
        recorded?: Array<{ a: string; b: string; type: string }>;
        skipped?: Array<{ a: string; b: string; type: string; reason: string }>;
        error?: string;
      };

      if (data.error) {
        console.log(`error: ${data.error}`);
        continue;
      }

      const recorded = data.recorded?.length ?? 0;
      const skipped = data.skipped?.length ?? 0;
      totalRecorded += recorded;
      totalSkipped += skipped;

      if (recorded > 0) {
        console.log(`recorded ${recorded}: ${data.recorded!.map((r) => `${r.a}-${r.b}(${r.type})`).join(', ')}`);
      } else {
        console.log(`no relations${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      console.log(`fetch failed: ${(err as Error).message}`);
    }
  }

  const relCount = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log('\n=== Summary ===');
  console.log(`Memories scanned: ${result.rows.length}`);
  console.log(`Relations recorded: ${totalRecorded}`);
  console.log(`Relations skipped: ${totalSkipped}`);
  console.log(`Final relations count: ${(relCount.rows[0] as { c: number }).c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
