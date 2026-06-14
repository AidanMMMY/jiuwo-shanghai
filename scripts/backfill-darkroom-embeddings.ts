// One-shot script to backfill embeddings for existing darkroom_memories.
// Run with: npx tsx scripts/backfill-darkroom-embeddings.ts

import { backfillMissingEmbeddings } from '@/lib/darkroom-memory';

// Load local env vars if present (Node 20.6+)
try {
  process.loadEnvFile?.('.env.local');
} catch {
  // ignore
}

const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 50;
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS) || 100;

async function main() {
  let total = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const updated = await backfillMissingEmbeddings(BATCH_SIZE);
    total += updated;
    console.log(`Round ${round + 1}: updated ${updated} memories`);
    if (updated === 0) break;
  }
  console.log(`Total updated: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
