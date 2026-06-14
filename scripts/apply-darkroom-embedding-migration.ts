// Applies the darkroom_memories embedding migration using the configured dimension.
// Run with: npx tsx scripts/apply-darkroom-embedding-migration.ts

import { neon } from '@neondatabase/serverless';
import { getEmbeddingDimensions } from '@/lib/darkroom-embedding';

try {
  process.loadEnvFile?.('.env.local');
} catch {
  // ignore
}

function getSql() {
  const url =
    process.env.POSTGRES_URL ||
    process.env.GUESTBOOK_POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

async function main() {
  const dims = getEmbeddingDimensions();
  const sql = getSql();

  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  // Drop and re-add only when empty; safe for initial setup.
  // If you already have embeddings stored, use ALTER COLUMN TYPE instead.
  await sql`ALTER TABLE darkroom_memories DROP COLUMN IF EXISTS embedding`;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN embedding vector(${dims})`;

  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_embedding
    ON darkroom_memories USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL`;

  console.log(`Applied darkroom_memories.embedding vector(${dims})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
