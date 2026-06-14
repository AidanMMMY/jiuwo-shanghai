import { neon } from '@neondatabase/serverless';
import { generateEmbedding, getEmbeddingDimensions } from './darkroom-embedding';

// Lazy env check — same pattern as guestbook.ts and rsvp.ts
function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

export interface Memory {
  id: number;
  content: string;
  keywords: string[];
  confidence: number;
  source_lang: 'en' | 'zh';
  created_at: string;
}

export interface ExtractedMemory {
  content: string;
  keywords: string[];
  confidence: number;
}

export interface Conversation {
  id: number;
  user_message: string;
  assistant_response: string;
  source_lang: 'en' | 'zh';
  processed_for_memory: boolean;
  created_at: string;
}

const MAX_MEMORIES_TOTAL = 1000;
const MIN_MEMORY_CONFIDENCE = 0.6;

const EN_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'am',
]);

const ZH_STOPWORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
]);

export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Always extract both Chinese characters and English words so memories can be
  // retrieved across languages. A Chinese memory about 酒 and an English query
  // about drink will only overlap if the stored memory includes bilingual
  // keywords (provided by the extraction LLM), but the query side is ready for
  // mixed-language input.
  const chars = text.replace(/[^一-龥]/g, '').split('')
    .filter((c) => !ZH_STOPWORDS.has(c));
  const enWords = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !EN_STOPWORDS.has(w));
  return [...new Set([...chars, ...enWords])].slice(0, 10);
}

export async function ensureConversationsTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_conversations (
      id                   SERIAL PRIMARY KEY,
      user_message         TEXT NOT NULL,
      assistant_response   TEXT NOT NULL,
      source_lang          VARCHAR(2) NOT NULL,
      processed_for_memory BOOLEAN NOT NULL DEFAULT FALSE,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_unprocessed ON darkroom_conversations(source_lang, processed_for_memory, created_at ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_created_at ON darkroom_conversations(created_at DESC)`;
}

export async function storeConversation(
  conv: Omit<Conversation, 'id' | 'processed_for_memory' | 'created_at'>
): Promise<Conversation> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    INSERT INTO darkroom_conversations (user_message, assistant_response, source_lang)
    VALUES (${conv.user_message}, ${conv.assistant_response}, ${conv.source_lang})
    RETURNING id, user_message, assistant_response, source_lang, processed_for_memory, created_at
  `;
  return result.rows[0] as Conversation;
}

export async function getUnprocessedConversations(
  sourceLang: 'en' | 'zh',
  limit: number
): Promise<Conversation[]> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, created_at
    FROM darkroom_conversations
    WHERE source_lang = ${sourceLang} AND processed_for_memory = FALSE
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return result.rows as Conversation[];
}

export async function markConversationsProcessed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await ensureConversationsTable();
  const sql = getSql();
  await sql`
    UPDATE darkroom_conversations
    SET processed_for_memory = TRUE
    WHERE id = ANY(${ids}::int[])
  `;
}

export async function ensureMemoriesTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_memories (
      id          SERIAL PRIMARY KEY,
      content     TEXT NOT NULL,
      keywords    TEXT[] NOT NULL DEFAULT '{}',
      confidence  NUMERIC(3,2) NOT NULL,
      source_lang VARCHAR(2) NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_keywords ON darkroom_memories USING GIN(keywords)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_created_at ON darkroom_memories(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_confidence ON darkroom_memories(confidence DESC)`;
}

export async function countAllMemories(): Promise<number> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    SELECT COUNT(*) as count FROM darkroom_memories
  `;
  return Number((result.rows[0] as { count: number }).count);
}

export async function pruneOldMemories(): Promise<void> {
  const count = await countAllMemories();
  if (count < MAX_MEMORIES_TOTAL) return;

  const toDelete = count - MAX_MEMORIES_TOTAL + 1; // +1 for the one about to be inserted
  const sql = getSql();
  await sql`
    DELETE FROM darkroom_memories
    WHERE id IN (
      SELECT id FROM darkroom_memories
      ORDER BY confidence ASC, created_at ASC
      LIMIT ${toDelete}
    )
  `;
}

const VECTOR_DEDUP_THRESHOLD = 0.92;

function formatVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function storeMemory(
  memory: Omit<Memory, 'id' | 'created_at'>
): Promise<Memory> {
  await ensureMemoriesTable();
  await pruneOldMemories();

  const embedding = await generateEmbedding(memory.content);
  const dims = getEmbeddingDimensions();
  const sql = getSql();

  const result = embedding
    ? await sql.query(
        `INSERT INTO darkroom_memories (content, keywords, confidence, source_lang, embedding)
         VALUES ($1, $2, $3, $4, $5::vector(${dims}))
         RETURNING id, content, keywords, confidence, source_lang, created_at`,
        [memory.content, memory.keywords, memory.confidence, memory.source_lang, formatVector(embedding)]
      )
    : await sql.query(
        `INSERT INTO darkroom_memories (content, keywords, confidence, source_lang, embedding)
         VALUES ($1, $2, $3, $4, NULL)
         RETURNING id, content, keywords, confidence, source_lang, created_at`,
        [memory.content, memory.keywords, memory.confidence, memory.source_lang]
      );

  return result.rows[0] as Memory;
}

export async function retrieveMemories(
  query: string,
  _sourceLang?: 'en' | 'zh',
  limit: number = 3
): Promise<Memory[]> {
  await ensureMemoriesTable();
  const sql = getSql();

  // ── Vector retrieval ──────────────────────────────────────────────────
  const queryEmbedding = await generateEmbedding(query);
  const vectorRows: (Memory & { score: number })[] = [];

  if (queryEmbedding) {
    const dims = getEmbeddingDimensions();
    const vectorResult = await sql.query(
      `SELECT id, content, keywords, confidence, source_lang, created_at,
        (1 - (embedding <=> $1::vector(${dims}))) AS score
      FROM darkroom_memories
      WHERE confidence >= $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector(${dims})
      LIMIT $3`,
      [formatVector(queryEmbedding), MIN_MEMORY_CONFIDENCE, 10]
    );
    vectorRows.push(...(vectorResult.rows as (Memory & { score: number })[]));
  }

  // ── Keyword retrieval (supplement / fallback) ─────────────────────────
  const keywords = extractKeywords(query);
  const keywordRows: (Memory & { score: number })[] = [];

  if (keywords.length > 0) {
    const keywordResult = await sql`
      SELECT id, content, keywords, confidence, source_lang, created_at,
        (
          COALESCE(array_length(
            ARRAY(SELECT UNNEST(keywords) INTERSECT SELECT UNNEST(${keywords}::text[])),
            1
          ), 0) * 2.0 +
          1.0 / (EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 1.0)
        ) AS score
      FROM darkroom_memories
      WHERE confidence >= ${MIN_MEMORY_CONFIDENCE}
        AND keywords && ${keywords}::text[]
      ORDER BY score DESC
      LIMIT 10
    `;
    keywordRows.push(...(keywordResult.rows as (Memory & { score: number })[]));
  }

  // ── Merge and rank ────────────────────────────────────────────────────
  const seen = new Set<number>();
  const merged = new Map<number, Memory & { score: number }>();

  for (const row of vectorRows) {
    merged.set(row.id, row);
    seen.add(row.id);
  }

  for (const row of keywordRows) {
    const existing = merged.get(row.id);
    if (existing) {
      existing.score += row.score * 0.5;
    } else {
      merged.set(row.id, row);
    }
  }

  const ranked = Array.from(merged.values())
    .map((row) => {
      const days = Math.max(
        0,
        (Date.now() - new Date(row.created_at).getTime()) / 86400000
      );
      const recency = 1.0 / (days + 1.0);
      return { ...row, score: row.score + recency * 0.1 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length > 0) {
    return ranked.map(({ id, content, keywords, confidence, source_lang, created_at }) => ({
      id,
      content,
      keywords,
      confidence,
      source_lang,
      created_at,
    }));
  }

  // ── Final fallback: recent high-confidence memories ───────────────────
  const fallback = await sql`
    SELECT id, content, keywords, confidence, source_lang, created_at
    FROM darkroom_memories
    WHERE confidence >= ${MIN_MEMORY_CONFIDENCE}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return fallback.rows as Memory[];
}

export async function findSimilarMemory(
  content: string,
  _sourceLang?: 'en' | 'zh',
  threshold: number = 0.65
): Promise<Memory | null> {
  await ensureMemoriesTable();
  const sql = getSql();

  // Try vector deduplication first.
  const embedding = await generateEmbedding(content);
  if (embedding) {
    const dims = getEmbeddingDimensions();
    const result = await sql.query(
      `SELECT id, content, keywords, confidence, source_lang, created_at,
        (1 - (embedding <=> $1::vector(${dims}))) AS similarity
      FROM darkroom_memories
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector(${dims})
      LIMIT 1`,
      [formatVector(embedding)]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0] as Memory & { similarity: number };
      if (row.similarity >= VECTOR_DEDUP_THRESHOLD) {
        return row;
      }
    }
  }

  // Fallback to keyword Jaccard.
  const keywords = extractKeywords(content);
  if (keywords.length === 0) return null;

  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, created_at,
      (
        COALESCE(
          array_length(
            ARRAY(SELECT UNNEST(keywords) INTERSECT SELECT UNNEST(${keywords}::text[])),
            1
          ),
          0
        )::float /
        GREATEST(array_length(keywords, 1), ${keywords.length})
      ) as similarity
    FROM darkroom_memories
    WHERE keywords && ${keywords}::text[]
    ORDER BY similarity DESC
    LIMIT 1
  `;

  if (result.rows.length > 0) {
    const row = result.rows[0] as Memory & { similarity: number };
    if (row.similarity >= threshold) {
      return row;
    }
  }
  return null;
}

export async function backfillMissingEmbeddings(batchSize: number = 50): Promise<number> {
  await ensureMemoriesTable();
  const sql = getSql();
  const dims = getEmbeddingDimensions();

  const result = await sql`
    SELECT id, content
    FROM darkroom_memories
    WHERE embedding IS NULL
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `;

  const rows = result.rows as { id: number; content: string }[];
  if (rows.length === 0) return 0;

  let updated = 0;
  for (const row of rows) {
    const embedding = await generateEmbedding(row.content);
    if (!embedding) continue;
    await sql.query(
      `UPDATE darkroom_memories
       SET embedding = $1::vector(${dims})
       WHERE id = $2`,
      [formatVector(embedding), row.id]
    );
    updated++;
  }
  return updated;
}

export interface MemoryStats {
  total: number;
  byLang: { source_lang: string; count: number }[];
}

export interface ConversationStats {
  total: number;
  unprocessed: number;
  byLang: { source_lang: string; count: number }[];
}

export async function getMemoryStats(): Promise<MemoryStats> {
  await ensureMemoriesTable();
  const sql = getSql();
  const totalResult = await sql`SELECT COUNT(*) as count FROM darkroom_memories`;
  const byLangResult = await sql`
    SELECT source_lang, COUNT(*) as count
    FROM darkroom_memories
    GROUP BY source_lang
    ORDER BY source_lang
  `;
  return {
    total: Number((totalResult.rows[0] as { count: number }).count),
    byLang: byLangResult.rows as { source_lang: string; count: number }[],
  };
}

export async function getRecentMemories(limit: number = 20): Promise<Memory[]> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, created_at
    FROM darkroom_memories
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Memory[];
}

export async function getConversationStats(): Promise<ConversationStats> {
  await ensureConversationsTable();
  const sql = getSql();
  const totalResult = await sql`SELECT COUNT(*) as count FROM darkroom_conversations`;
  const unprocessedResult = await sql`
    SELECT COUNT(*) as count FROM darkroom_conversations WHERE processed_for_memory = FALSE
  `;
  const byLangResult = await sql`
    SELECT source_lang, COUNT(*) as count
    FROM darkroom_conversations
    GROUP BY source_lang
    ORDER BY source_lang
  `;
  return {
    total: Number((totalResult.rows[0] as { count: number }).count),
    unprocessed: Number((unprocessedResult.rows[0] as { count: number }).count),
    byLang: byLangResult.rows as { source_lang: string; count: number }[],
  };
}

export async function getRecentConversations(limit: number = 20): Promise<Conversation[]> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, created_at
    FROM darkroom_conversations
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Conversation[];
}
