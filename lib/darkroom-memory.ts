import { neon } from '@neondatabase/serverless';

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

const MAX_MEMORIES_PER_LANG = 500;

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

export function extractKeywords(text: string, lang: 'en' | 'zh'): string[] {
  if (!text) return [];

  if (lang === 'en') {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !EN_STOPWORDS.has(w));
    return [...new Set(words)].slice(0, 10);
  }

  // Chinese: keep Chinese chars + English words
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
    WHERE id IN (${ids})
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

export async function countMemories(sourceLang: 'en' | 'zh'): Promise<number> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    SELECT COUNT(*) as count FROM darkroom_memories WHERE source_lang = ${sourceLang}
  `;
  return Number((result.rows[0] as { count: number }).count);
}

export async function pruneOldMemories(sourceLang: 'en' | 'zh'): Promise<void> {
  const count = await countMemories(sourceLang);
  if (count < MAX_MEMORIES_PER_LANG) return;

  const toDelete = count - MAX_MEMORIES_PER_LANG + 1; // +1 for the one about to be inserted
  const sql = getSql();
  await sql`
    DELETE FROM darkroom_memories
    WHERE id IN (
      SELECT id FROM darkroom_memories
      WHERE source_lang = ${sourceLang}
      ORDER BY confidence ASC, created_at ASC
      LIMIT ${toDelete}
    )
  `;
}

export async function storeMemory(
  memory: Omit<Memory, 'id' | 'created_at'>
): Promise<Memory> {
  await ensureMemoriesTable();
  await pruneOldMemories(memory.source_lang);

  const sql = getSql();
  const result = await sql`
    INSERT INTO darkroom_memories (content, keywords, confidence, source_lang)
    VALUES (${memory.content}, ${memory.keywords}, ${memory.confidence}, ${memory.source_lang})
    RETURNING id, content, keywords, confidence, source_lang, created_at
  `;
  return result.rows[0] as Memory;
}

export async function retrieveMemories(
  query: string,
  sourceLang: 'en' | 'zh',
  limit: number = 3
): Promise<Memory[]> {
  await ensureMemoriesTable();
  const sql = getSql();
  const keywords = extractKeywords(query, sourceLang);

  if (keywords.length === 0) {
    const result = await sql`
      SELECT id, content, keywords, confidence, source_lang, created_at
      FROM darkroom_memories
      WHERE source_lang = ${sourceLang} AND confidence >= 0.7
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result.rows as Memory[];
  }

  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, created_at,
      (
        array_length(
          ARRAY(SELECT UNNEST(keywords) INTERSECT SELECT UNNEST(${keywords}::text[])),
          1
        ) * 2.0 +
        1.0 / (EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 1.0)
      ) as score
    FROM darkroom_memories
    WHERE source_lang = ${sourceLang}
      AND confidence >= 0.7
      AND keywords && ${keywords}::text[]
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  if (result.rows.length > 0) {
    return result.rows as Memory[];
  }

  // Fallback: recent high-confidence memories
  const fallback = await sql`
    SELECT id, content, keywords, confidence, source_lang, created_at
    FROM darkroom_memories
    WHERE source_lang = ${sourceLang} AND confidence >= 0.7
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return fallback.rows as Memory[];
}
