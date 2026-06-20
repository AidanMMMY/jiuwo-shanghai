// Continue processing already-unprocessed conversations via backfill endpoint.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/continue-darkroom-relations-backfill.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
const sql = neon(url, { fullResults: true });

const BASE_URL = process.env.DARKROOM_BASE_URL || 'https://www.jiuwoshanghai.net';

async function main() {
  let round = 0;
  let totalProcessed = 0;

  while (true) {
    const status = await sql`
      SELECT COUNT(*) FILTER (WHERE processed_for_memory = FALSE) as unprocessed
      FROM darkroom_conversations
    `;
    const unprocessed = Number((status.rows[0] as { unprocessed: number }).unprocessed);
    if (unprocessed === 0) {
      console.log('No more unprocessed conversations.');
      break;
    }

    round++;
    console.log(`\nRound ${round}: ${unprocessed} unprocessed conversations remaining`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${BASE_URL}/api/darkroom/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backfill: true, isZh: true }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await res.json().catch(() => ({}))) as { processed?: number; stored?: number; error?: string };
      console.log('Response:', res.status, data);
      totalProcessed += data.processed ?? 0;

      if (data.error) {
        console.error('API returned error, stopping.');
        break;
      }
      if ((data.processed ?? 0) === 0) {
        console.log('No conversations processed this round, switching to English.');
        const res2 = await fetch(`${BASE_URL}/api/darkroom/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backfill: true, isZh: false }),
          signal: controller.signal,
        });
        const data2 = (await res2.json().catch(() => ({}))) as { processed?: number; stored?: number; error?: string };
        console.log('English response:', res2.status, data2);
        totalProcessed += data2.processed ?? 0;
        if ((data2.processed ?? 0) === 0) break;
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error('Fetch failed:', err);
      break;
    }
  }

  const relCount = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log('\n=== Summary ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Final relations count: ${(relCount.rows[0] as { c: number }).c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
