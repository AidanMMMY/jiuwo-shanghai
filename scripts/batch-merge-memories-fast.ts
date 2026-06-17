import { backfillMissingEmbeddings } from '../lib/darkroom-memory';
import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

interface SimilarPair {
  aid: number;
  bid: number;
  sim: number;
}

function mergeContent(a: string, b: string): string {
  const at = a.trim();
  const bt = b.trim();
  if (at === bt) return at;
  const al = at.toLowerCase();
  const bl = bt.toLowerCase();
  if (bl.includes(al)) return bt;
  if (al.includes(bl)) return at;
  return `${at} / ${bt}`;
}

async function main() {
  const sql = getSql();

  console.log('Finding similar memory pairs (>= 0.85) using existing embeddings...');
  const result = await sql`
    SELECT a.id AS aid, b.id AS bid, (1 - (a.embedding <=> b.embedding)) AS sim
    FROM darkroom_memories a
    CROSS JOIN LATERAL (
      SELECT id, embedding
      FROM darkroom_memories b
      WHERE b.id < a.id AND b.embedding IS NOT NULL
      ORDER BY a.embedding <=> b.embedding
      LIMIT 1
    ) b
    WHERE a.embedding IS NOT NULL
      AND (1 - (a.embedding <=> b.embedding)) >= 0.85
    ORDER BY a.id ASC
  `;
  const pairs = result.rows as SimilarPair[];
  console.log(`Found ${pairs.length} merge candidates`);

  let merged = 0;
  let skipped = 0;
  const deleted = new Set<number>();

  for (const pair of pairs) {
    if (deleted.has(pair.aid) || deleted.has(pair.bid)) {
      skipped++;
      continue;
    }

    try {
      const [existingRow, candidateRow] = await Promise.all([
        sql`SELECT content, keywords, confidence, source_lang FROM darkroom_memories WHERE id = ${pair.aid}`,
        sql`SELECT content, keywords, confidence FROM darkroom_memories WHERE id = ${pair.bid}`,
      ]);

      if (existingRow.rows.length === 0 || candidateRow.rows.length === 0) {
        skipped++;
        continue;
      }

      const existing = existingRow.rows[0] as {
        content: string;
        keywords: string[];
        confidence: number;
        source_lang: 'en' | 'zh';
      };
      const candidate = candidateRow.rows[0] as {
        content: string;
        keywords: string[];
        confidence: number;
      };

      const mergedContent = mergeContent(existing.content, candidate.content);
      const mergedKeywords = [...new Set([...existing.keywords, ...candidate.keywords])]
        .map((k) => (k as string).toLowerCase().trim())
        .slice(0, 10);
      const mergedConfidence = Math.max(
        typeof existing.confidence === 'string' ? parseFloat(existing.confidence) : existing.confidence,
        typeof candidate.confidence === 'string' ? parseFloat(candidate.confidence) : candidate.confidence
      );

      await sql`
        UPDATE darkroom_memories
        SET content = ${mergedContent},
            keywords = ${mergedKeywords},
            confidence = ${mergedConfidence},
            updated_at = NOW(),
            embedding = NULL
        WHERE id = ${pair.aid}
      `;
      await sql`DELETE FROM darkroom_memories WHERE id = ${pair.bid}`;
      deleted.add(pair.bid);

      console.log(`Merged memory ${pair.bid} into ${pair.aid} (similarity ${pair.sim.toFixed(3)})`);
      merged++;
    } catch (err) {
      console.error(`Error merging ${pair.bid} into ${pair.aid}:`, err);
      skipped++;
    }
  }

  console.log(`\nMerge done. Merged: ${merged}, Skipped: ${skipped}`);

  const missing = await sql`
    SELECT COUNT(*) AS count FROM darkroom_memories WHERE embedding IS NULL
  `;
  const missingCount = Number((missing.rows[0] as { count: number }).count);
  if (missingCount > 0) {
    console.log(`Backfilling ${missingCount} missing embeddings...`);
    const backfilled = await backfillMissingEmbeddings(50);
    console.log(`Backfilled ${backfilled} embeddings`);
  } else {
    console.log('No missing embeddings');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
