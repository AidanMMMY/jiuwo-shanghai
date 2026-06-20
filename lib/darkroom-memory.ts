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
  memory_type?: 'user_fact' | 'system_inferred' | 'correction' | 'self_fact';
  source_identity?: string;
  retrieval_count?: number;
  last_retrieved_at?: string;
  created_at: string;
  updated_at?: string;
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
  session_id?: string;
  created_at: string;
}

export interface SessionConversationGroup {
  sessionId: string;
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
  conversations: Conversation[];
}

function shortenSessionId(sessionId: string): string {
  if (sessionId.length <= 16) return sessionId;
  return `${sessionId.slice(0, 12)}…${sessionId.slice(-4)}`;
}

const MAX_MEMORIES_TOTAL = 3000;
const MIN_MEMORY_CONFIDENCE = 0.6;

const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const CHAT_MIN_CONFIDENCE = 0.7;

const SENSITIVE_ZH_KEYWORDS = new Set([
  "摸下体",
  "性骚扰",
  "性侵",
  "强奸",
  "猥亵",
  "偷窥",
  "骚扰",
  "妓女",
  "卖淫",
  "吸毒",
  "自杀",
  "自残",
  "杀人",
  "暴力",
  "仇恨",
  "色情",
]);

const SENSITIVE_EN_KEYWORDS = new Set([
  "grope",
  "molest",
  "rape",
  "sexual assault",
  "sexual harassment",
  "harass",
  "stalk",
  "peep",
  "voyeur",
  "prostitute",
  "porn",
  "drug abuse",
  "suicide",
  "self-harm",
  "kill",
  "violence",
  "hate",
]);

const ZH_ALLOWED_PREFIXES = new Set([
  "避免",
  "防止",
  "反对",
  "拒绝",
  "预防",
  "制止",
]);

function hasSensitiveZhKeyword(content: string): boolean {
  const lower = content.toLowerCase();
  for (const kw of SENSITIVE_ZH_KEYWORDS) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx === -1) continue;
    // Allow benign prevention/discussion contexts.
    const prefix = lower.slice(Math.max(0, idx - 8), idx);
    let allowed = false;
    for (const allow of ZH_ALLOWED_PREFIXES) {
      if (prefix.includes(allow)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) return true;
  }
  return false;
}

export function isSensitiveMemory(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  for (const kw of SENSITIVE_EN_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(lower)) return true;
  }
  return hasSensitiveZhKeyword(content);
}

const PHONE_REGEX = /(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function scrubPii(text: string): string {
  return text
    .replace(PHONE_REGEX, "[PHONE]")
    .replace(EMAIL_REGEX, "[EMAIL]");
}

export interface FilterMemoriesOptions {
  minConfidence?: number;
  excludeSensitive?: boolean;
  maxMediumConfidence?: number;
  maxSystemInferred?: number;
}

export function filterMemoriesForChat(
  memories: Memory[],
  options: FilterMemoriesOptions = {}
): Memory[] {
  const {
    minConfidence = CHAT_MIN_CONFIDENCE,
    excludeSensitive = true,
    maxMediumConfidence = 2,
    maxSystemInferred = 1,
  } = options;

  const filtered = memories.filter((m) => {
    const confidence =
      typeof m.confidence === "string" ? parseFloat(m.confidence) : m.confidence;
    if (confidence < minConfidence) return false;
    if (excludeSensitive && isSensitiveMemory(m.content)) return false;
    return true;
  });

  const high = filtered.filter((m) => {
    const confidence =
      typeof m.confidence === "string" ? parseFloat(m.confidence) : m.confidence;
    return confidence >= HIGH_CONFIDENCE_THRESHOLD;
  });

  const medium = filtered
    .filter((m) => {
      const confidence =
        typeof m.confidence === "string" ? parseFloat(m.confidence) : m.confidence;
      return confidence >= minConfidence && confidence < HIGH_CONFIDENCE_THRESHOLD;
    })
    .slice(0, maxMediumConfidence);

  let combined = [...high, ...medium];

  // Cap system_inferred memories so authoritative facts and corrections dominate.
  const systemInferred = combined.filter((m) => m.memory_type === "system_inferred");
  if (systemInferred.length > maxSystemInferred) {
    const keep = new Set(systemInferred.slice(0, maxSystemInferred).map((m) => m.id));
    combined = combined.filter((m) => m.memory_type !== "system_inferred" || keep.has(m.id));
  }

  return combined.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

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
  return normalizeKeywords([...new Set([...chars, ...enWords])]);
}

const KEYWORD_CANONICAL_MAP: Record<string, string> = {
  'xiao ma': '小马',
  phillip: '小马',
  jiuwo: '啾喔',
  'lao wang': '老王',
  alin: '阿林',
  situ: '司徒',
  aidan: 'Aidan',
  devil: 'Devil',
  dex: 'Dex',
  zack: 'Zack',
  bob: 'Bob',
  tee: 'Tee',
  arthur: 'Arthur',
  gary: 'Gary',
  ethan: 'Ethan',
  chris: 'Chris',
  owen: 'Owen',
  alex: 'Alex',
  ray: 'Ray',
};

export function normalizeKeywords(keywords: string[]): string[] {
  return [...new Set(
    keywords
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map((k) => KEYWORD_CANONICAL_MAP[k.toLowerCase()] || k)
  )].slice(0, 10);
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
      session_id           VARCHAR(64),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Defensive: older deployments created this table before session_id existed.
  await sql`ALTER TABLE darkroom_conversations ADD COLUMN IF NOT EXISTS session_id VARCHAR(64)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_unprocessed ON darkroom_conversations(source_lang, processed_for_memory, created_at ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_created_at ON darkroom_conversations(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_session ON darkroom_conversations(session_id, created_at DESC)`;

  // Self-healing FK: ensures cleanup cascades on future deployments.
  await ensureSessionsTable();
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_darkroom_conversations_session'
      ) THEN
        DELETE FROM darkroom_conversations
        WHERE session_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM darkroom_sessions WHERE session_id = darkroom_conversations.session_id
          );
        ALTER TABLE darkroom_conversations
          ADD CONSTRAINT fk_darkroom_conversations_session
          FOREIGN KEY (session_id) REFERENCES darkroom_sessions(session_id)
          ON DELETE CASCADE;
      END IF;
    END
    $$;
  `;
}

export async function storeConversation(
  conv: Omit<Conversation, 'id' | 'processed_for_memory' | 'created_at'>
): Promise<Conversation> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    INSERT INTO darkroom_conversations (user_message, assistant_response, source_lang, session_id)
    VALUES (${conv.user_message}, ${conv.assistant_response}, ${conv.source_lang}, ${conv.session_id ?? null})
    RETURNING id, user_message, assistant_response, source_lang, processed_for_memory, session_id, created_at
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
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, session_id, created_at
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
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN IF NOT EXISTS memory_type VARCHAR(32) NOT NULL DEFAULT 'user_fact'`;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN IF NOT EXISTS source_identity VARCHAR(64)`;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN IF NOT EXISTS retrieval_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE darkroom_memories ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_keywords ON darkroom_memories USING GIN(keywords)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_created_at ON darkroom_memories(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_confidence ON darkroom_memories(confidence DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_type ON darkroom_memories(memory_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_source_identity ON darkroom_memories(source_identity)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_memories_last_retrieved ON darkroom_memories(last_retrieved_at)`;
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

const VECTOR_DEDUP_THRESHOLD = 0.85;

// Privacy and TTL features are designed but currently disabled.
// Set to true to enable "forget me" handling and automatic profile degradation.
export const PRIVACY_FEATURES_ENABLED = false;

function formatVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function storeMemory(
  memory: Omit<Memory, 'id' | 'created_at'>
): Promise<Memory> {
  await ensureMemoriesTable();
  await pruneOldMemories();

  const keywords = normalizeKeywords(memory.keywords);
  const memoryType = memory.memory_type ?? 'user_fact';
  const embedding = await generateEmbedding(memory.content);
  const dims = getEmbeddingDimensions();
  const sql = getSql();

  const result = embedding
    ? await sql.query(
        `INSERT INTO darkroom_memories (content, keywords, confidence, source_lang, memory_type, source_identity, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector(${dims}))
         RETURNING id, content, keywords, confidence, source_lang, memory_type, source_identity, retrieval_count, last_retrieved_at, created_at, updated_at`,
        [memory.content, keywords, memory.confidence, memory.source_lang, memoryType, memory.source_identity ?? null, formatVector(embedding)]
      )
    : await sql.query(
        `INSERT INTO darkroom_memories (content, keywords, confidence, source_lang, memory_type, source_identity, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, NULL)
         RETURNING id, content, keywords, confidence, source_lang, memory_type, source_identity, retrieval_count, last_retrieved_at, created_at, updated_at`,
        [memory.content, keywords, memory.confidence, memory.source_lang, memoryType, memory.source_identity ?? null]
      );

  return result.rows[0] as Memory;
}

export async function getMemoryById(id: number): Promise<Memory | null> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at, updated_at
    FROM darkroom_memories
    WHERE id = ${id}
  `;
  return result.rows.length > 0 ? (result.rows[0] as Memory) : null;
}

function mergeMemoryContent(existing: string, candidate: string): string {
  const a = existing.trim();
  const b = candidate.trim();
  if (a === b) return a;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (bLower.includes(aLower)) return b;
  if (aLower.includes(bLower)) return a;
  return `${a} / ${b}`;
}

export async function mergeSimilarMemory(
  existingId: number,
  candidate: Omit<Memory, 'id' | 'created_at' | 'updated_at'>
): Promise<Memory | null> {
  await ensureMemoriesTable();
  const existing = await getMemoryById(existingId);
  if (!existing) return null;

  const mergedContent = mergeMemoryContent(existing.content, candidate.content);
  const mergedKeywords = normalizeKeywords([...existing.keywords, ...candidate.keywords]);
  const mergedConfidence = Math.max(
    typeof existing.confidence === 'string' ? parseFloat(existing.confidence) : existing.confidence,
    candidate.confidence
  );
  const mergedSourceIdentity = existing.source_identity || candidate.source_identity || undefined;
  // Preserve the more authoritative memory_type when merging.
  const mergedType: Memory['memory_type'] =
    existing.memory_type === 'correction' || candidate.memory_type === 'correction'
      ? 'correction'
      : existing.memory_type === 'self_fact' || candidate.memory_type === 'self_fact'
      ? 'self_fact'
      : existing.memory_type === 'user_fact' || candidate.memory_type === 'user_fact'
      ? 'user_fact'
      : existing.memory_type;

  const embedding = await generateEmbedding(mergedContent);
  const dims = getEmbeddingDimensions();
  const sql = getSql();

  const result = embedding
    ? await sql.query(
        `UPDATE darkroom_memories
         SET content = $1,
             keywords = $2,
             confidence = $3,
             memory_type = $4,
             source_identity = $5,
             updated_at = NOW(),
             embedding = $6::vector(${dims})
         WHERE id = $7
         RETURNING id, content, keywords, confidence, source_lang, memory_type, source_identity, retrieval_count, last_retrieved_at, created_at, updated_at`,
        [mergedContent, mergedKeywords, mergedConfidence, mergedType, mergedSourceIdentity ?? null, formatVector(embedding), existingId]
      )
    : await sql.query(
        `UPDATE darkroom_memories
         SET content = $1,
             keywords = $2,
             confidence = $3,
             memory_type = $4,
             source_identity = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, content, keywords, confidence, source_lang, memory_type, source_identity, retrieval_count, last_retrieved_at, created_at, updated_at`,
        [mergedContent, mergedKeywords, mergedConfidence, mergedType, mergedSourceIdentity ?? null, existingId]
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
      `SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at,
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
      SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at,
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

  const typePriority: Record<string, number> = {
    correction: 1.5,
    self_fact: 1.2,
    user_fact: 1.0,
    system_inferred: -0.5,
  };

  const ranked = Array.from(merged.values())
    .map((row) => {
      const days = Math.max(
        0,
        (Date.now() - new Date(row.created_at).getTime()) / 86400000
      );
      const recency = 1.0 / (days + 1.0);
      const typeBoost = typePriority[row.memory_type ?? 'user_fact'] ?? 0;
      return { ...row, score: row.score + recency * 0.1 + typeBoost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const result = ranked.map(({ id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at }) => ({
    id,
    content,
    keywords,
    confidence,
    source_lang,
    memory_type,
    source_identity,
    created_at,
  }));

  // Track retrieval usage asynchronously.
  if (result.length > 0) {
    const ids = result.map((m) => m.id);
    sql`
      UPDATE darkroom_memories
      SET retrieval_count = retrieval_count + 1,
          last_retrieved_at = NOW()
      WHERE id = ANY(${ids}::int[])
    `.catch((err) => console.error('[darkroom:memory] retrieval tracking error:', err));
  }

  if (result.length > 0) {
    return result;
  }

  // ── Final fallback: recent high-confidence memories ───────────────────
  const fallback = await sql`
    SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at
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
      `SELECT id, content, keywords, confidence, source_lang, source_identity, created_at,
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
    SELECT id, content, keywords, confidence, source_lang, source_identity, created_at,
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
  byType: { memory_type: string; count: number }[];
  retrieval: {
    totalRetrievals: number;
    neverRetrieved: number;
    avgRetrievalCount: number;
  };
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
  const byTypeResult = await sql`
    SELECT memory_type, COUNT(*) as count
    FROM darkroom_memories
    GROUP BY memory_type
    ORDER BY count DESC
  `;
  const retrievalResult = await sql`
    SELECT
      COALESCE(SUM(retrieval_count), 0) as total_retrievals,
      COUNT(*) FILTER (WHERE retrieval_count = 0 OR last_retrieved_at IS NULL) as never_retrieved,
      ROUND(AVG(retrieval_count)::numeric, 2) as avg_retrieval_count
    FROM darkroom_memories
  `;
  const retrievalRow = retrievalResult.rows[0] as {
    total_retrievals: number;
    never_retrieved: number;
    avg_retrieval_count: number;
  };
  return {
    total: Number((totalResult.rows[0] as { count: number }).count),
    byLang: byLangResult.rows as { source_lang: string; count: number }[],
    byType: byTypeResult.rows as { memory_type: string; count: number }[],
    retrieval: {
      totalRetrievals: Number(retrievalRow.total_retrievals),
      neverRetrieved: Number(retrievalRow.never_retrieved),
      avgRetrievalCount: Number(retrievalRow.avg_retrieval_count),
    },
  };
}

export async function searchMemoriesByKeyword(
  keyword: string,
  limit: number = 3
): Promise<Memory[]> {
  await ensureMemoriesTable();
  const sql = getSql();
  const pattern = `%${keyword}%`;
  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, created_at
    FROM darkroom_memories
    WHERE content ILIKE ${pattern}
       OR ${keyword} = ANY(keywords)
       OR EXISTS (
         SELECT 1 FROM UNNEST(keywords) AS k
         WHERE k ILIKE ${pattern}
       )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Memory[];
}

export async function getRecentMemories(limit: number = 20): Promise<Memory[]> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, content, keywords, confidence, source_lang, memory_type, source_identity, retrieval_count, created_at
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

export async function getRecentConversationsBySession(
  sessionId: string,
  limit: number = 10
): Promise<Conversation[]> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, session_id, created_at
    FROM darkroom_conversations
    WHERE session_id = ${sessionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (result.rows as Conversation[]).reverse();
}

export async function searchConversationsByKeyword(
  keyword: string,
  limit: number = 50
): Promise<Conversation[]> {
  await ensureConversationsTable();
  const sql = getSql();
  const pattern = `%${keyword}%`;
  const result = await sql`
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, session_id, created_at
    FROM darkroom_conversations
    WHERE user_message ILIKE ${pattern}
       OR assistant_response ILIKE ${pattern}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Conversation[];
}

export async function getRecentConversationsGroupedBySession(): Promise<SessionConversationGroup[]> {
  await ensureConversationsTable();
  const sql = getSql();

  const sessionResult = await sql`
    SELECT
      COALESCE(c.session_id, 'unassigned') AS session_id,
      COALESCE(s.summary, '') AS summary,
      MIN(c.created_at) AS first_message_at,
      MAX(c.created_at) AS last_message_at
    FROM darkroom_conversations c
    LEFT JOIN darkroom_sessions s ON c.session_id = s.session_id
    GROUP BY COALESCE(c.session_id, 'unassigned'), s.summary
    ORDER BY MAX(c.created_at) DESC
  `;

  if (sessionResult.rows.length === 0) {
    return [];
  }

  const sessionIds = sessionResult.rows.map((row) => row.session_id as string);
  if (sessionIds.length === 0) {
    return [];
  }

  const convResult = await sql`
    SELECT
      id,
      user_message,
      assistant_response,
      source_lang,
      processed_for_memory,
      COALESCE(session_id, 'unassigned') AS session_id,
      created_at
    FROM darkroom_conversations
    WHERE COALESCE(session_id, 'unassigned') = ANY(${sessionIds}::text[])
    ORDER BY created_at ASC
  `;

  const conversationsBySession = new Map<string, Conversation[]>();
  for (const conv of convResult.rows as Conversation[]) {
    const sid = conv.session_id as string;
    if (!conversationsBySession.has(sid)) {
      conversationsBySession.set(sid, []);
    }
    conversationsBySession.get(sid)!.push(conv);
  }

  return sessionResult.rows.map((row) => {
    const sid = (row.session_id as string) ?? "unassigned";
    const summary = sid === "unassigned"
      ? "Unassigned"
      : (row.summary as string) || shortenSessionId(sid);
    return {
      sessionId: sid,
      summary,
      firstMessageAt: (row.first_message_at as string) ?? new Date(0).toISOString(),
      lastMessageAt: (row.last_message_at as string) ?? new Date(0).toISOString(),
      conversations: conversationsBySession.get(sid) ?? [],
    };
  });
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

export async function deleteMemoryById(id: number): Promise<boolean> {
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    DELETE FROM darkroom_memories WHERE id = ${id}
  `;
  return (result.rowCount ?? 0) > 0;
}

export async function deleteMemoriesByIds(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensureMemoriesTable();
  const sql = getSql();
  const result = await sql`
    DELETE FROM darkroom_memories WHERE id = ANY(${ids}::int[])
  `;
  return result.rowCount ?? 0;
}

// ── Session-level rolling summary ──────────────────────────────────────

export interface SessionState {
  session_id: string;
  summary: string;
  primary_entity?: string;
  last_user_intent?: string;
  user_identity?: string;
  identity_probe_sent?: boolean;
  identity_probe_count?: number;
  identity_probe_declined?: boolean;
  identity_probe_last_turn?: number;
  updated_at: string;
}

export async function ensureSessionsTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_sessions (
      id             SERIAL PRIMARY KEY,
      session_id     VARCHAR(64) NOT NULL UNIQUE,
      summary        TEXT NOT NULL DEFAULT '',
      primary_entity VARCHAR(64),
      last_user_intent VARCHAR(32),
      user_identity  VARCHAR(64),
      identity_probe_sent BOOLEAN NOT NULL DEFAULT FALSE,
      identity_probe_count INTEGER NOT NULL DEFAULT 0,
      identity_probe_declined BOOLEAN NOT NULL DEFAULT FALSE,
      identity_probe_last_turn INTEGER,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS user_identity VARCHAR(64)`;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS identity_probe_sent BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS identity_probe_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS identity_probe_declined BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE darkroom_sessions ADD COLUMN IF NOT EXISTS identity_probe_last_turn INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_sessions_id ON darkroom_sessions(session_id)`;
}

export async function getSessionState(
  sessionId: string
): Promise<SessionState | null> {
  await ensureSessionsTable();
  const sql = getSql();
  const result = await sql`
    SELECT session_id, summary, primary_entity, last_user_intent, user_identity, identity_probe_sent, identity_probe_count, identity_probe_declined, identity_probe_last_turn, updated_at
    FROM darkroom_sessions
    WHERE session_id = ${sessionId}
  `;
  return result.rows.length > 0 ? (result.rows[0] as SessionState) : null;
}

export async function upsertSessionState(
  sessionId: string,
  state: Partial<Omit<SessionState, "session_id" | "updated_at">>
): Promise<SessionState> {
  await ensureSessionsTable();
  const sql = getSql();
  const result = await sql`
    INSERT INTO darkroom_sessions (session_id, summary, primary_entity, last_user_intent, user_identity, identity_probe_sent)
    VALUES (${sessionId}, ${state.summary ?? ""}, ${state.primary_entity ?? null}, ${state.last_user_intent ?? null}, ${state.user_identity ?? null}, ${state.identity_probe_sent ?? false})
    ON CONFLICT (session_id)
    DO UPDATE SET
      summary = EXCLUDED.summary,
      primary_entity = EXCLUDED.primary_entity,
      last_user_intent = EXCLUDED.last_user_intent,
      user_identity = EXCLUDED.user_identity,
      identity_probe_sent = EXCLUDED.identity_probe_sent,
      updated_at = NOW()
    RETURNING session_id, summary, primary_entity, last_user_intent, user_identity, identity_probe_sent, updated_at
  `;
  return result.rows[0] as SessionState;
}

export async function updateIdentityProbeState(
  sessionId: string,
  state: {
    count?: number;
    declined?: boolean;
    lastTurn?: number;
  }
): Promise<void> {
  await ensureSessionsTable();
  if (state.count === undefined && state.declined === undefined && state.lastTurn === undefined) {
    return;
  }
  const sql = getSql();
  const setClauses: string[] = [];
  const values: (number | boolean | string)[] = [];
  if (state.count !== undefined) {
    values.push(state.count);
    setClauses.push(`identity_probe_count = $${values.length}`);
  }
  if (state.declined !== undefined) {
    values.push(state.declined);
    setClauses.push(`identity_probe_declined = $${values.length}`);
  }
  if (state.lastTurn !== undefined) {
    values.push(state.lastTurn);
    setClauses.push(`identity_probe_last_turn = $${values.length}`);
  }
  values.push(sessionId);
  const query = `UPDATE darkroom_sessions SET ${setClauses.join(", ")}, updated_at = NOW() WHERE session_id = $${values.length}`;
  await sql.query(query, values);
}

export async function getSessionIdentities(
  sessionIds: string[]
): Promise<Record<string, string>> {
  if (sessionIds.length === 0) return {};
  await ensureSessionsTable();
  const sql = getSql();
  const result = await sql`
    SELECT session_id, user_identity
    FROM darkroom_sessions
    WHERE session_id = ANY(${sessionIds}::text[])
      AND user_identity IS NOT NULL
  `;
  const map: Record<string, string> = {};
  for (const row of result.rows as { session_id: string; user_identity: string }[]) {
    map[row.session_id] = row.user_identity;
  }
  return map;
}

// ── Entities (people, places, concepts mentioned in Darkroom) ────────────

export interface Entity {
  id: number;
  name: string;
  aliases: string[];
  source: "user_mentioned" | "memory" | "knowledge_base";
  entity_type: string;
  profile: Record<string, unknown>;
  mention_count: number;
  first_seen_at: string;
  last_mentioned_at: string;
  created_at: string;
}

/** @deprecated Use Entity instead. */
export type DynamicEntity = Entity;

export type MemoryEntityRole = "subject" | "object" | "co_mention" | "mentioned";

export interface MemoryEntity {
  memory_id: number;
  entity_id: number;
  role: MemoryEntityRole;
  confidence: number;
  created_at: string;
}

export interface EntityRelation {
  id: number;
  entity_a_id: number;
  entity_b_id: number;
  relation_type: string;
  evidence_memory_id?: number;
  confidence: number;
  created_at: string;
}

export async function ensureEntitiesTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_entities (
      id                SERIAL PRIMARY KEY,
      name              VARCHAR(64) NOT NULL UNIQUE,
      aliases           TEXT[] NOT NULL DEFAULT '{}',
      source            VARCHAR(32) NOT NULL DEFAULT 'user_mentioned',
      entity_type       VARCHAR(32) NOT NULL DEFAULT 'person',
      profile           JSONB NOT NULL DEFAULT '{}',
      mention_count     INTEGER NOT NULL DEFAULT 0,
      first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE darkroom_entities ADD COLUMN IF NOT EXISTS entity_type VARCHAR(32) NOT NULL DEFAULT 'person'`;
  await sql`ALTER TABLE darkroom_entities ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE darkroom_entities ADD COLUMN IF NOT EXISTS mention_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE darkroom_entities ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE darkroom_entities ADD COLUMN IF NOT EXISTS last_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_entities_name ON darkroom_entities(name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_entities_aliases ON darkroom_entities USING GIN(aliases)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_entities_type ON darkroom_entities(entity_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_entities_last_mentioned ON darkroom_entities(last_mentioned_at DESC)`;
}

export async function ensureMemoryEntitiesTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_memory_entities (
      memory_id  INTEGER NOT NULL REFERENCES darkroom_memories(id) ON DELETE CASCADE,
      entity_id  INTEGER NOT NULL REFERENCES darkroom_entities(id) ON DELETE CASCADE,
      role       VARCHAR(16) NOT NULL DEFAULT 'mentioned',
      confidence NUMERIC(3,2) NOT NULL DEFAULT 0.8,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (memory_id, entity_id, role)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_memory_entities_entity ON darkroom_memory_entities(entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_memory_entities_memory ON darkroom_memory_entities(memory_id)`;
}

export async function ensureEntityRelationsTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_entity_relations (
      id                SERIAL PRIMARY KEY,
      entity_a_id       INTEGER NOT NULL REFERENCES darkroom_entities(id) ON DELETE CASCADE,
      entity_b_id       INTEGER NOT NULL REFERENCES darkroom_entities(id) ON DELETE CASCADE,
      relation_type     VARCHAR(32) NOT NULL,
      evidence_memory_id INTEGER REFERENCES darkroom_memories(id) ON DELETE SET NULL,
      confidence        NUMERIC(3,2) NOT NULL DEFAULT 0.7,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (entity_a_id, entity_b_id, relation_type)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_entity_relations_a ON darkroom_entity_relations(entity_a_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_entity_relations_b ON darkroom_entity_relations(entity_b_id)`;
}

export async function getDynamicEntities(): Promise<Entity[]> {
  await ensureEntitiesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, name, aliases, source, entity_type, profile, mention_count, first_seen_at, last_mentioned_at, created_at
    FROM darkroom_entities
    ORDER BY updated_at DESC
  `;
  return result.rows as Entity[];
}

export async function findEntityByName(
  name: string
): Promise<Entity | null> {
  await ensureEntitiesTable();
  const sql = getSql();
  const lower = name.trim().toLowerCase();
  if (!lower) return null;
  const result = await sql`
    SELECT id, name, aliases, source, entity_type, profile, mention_count, first_seen_at, last_mentioned_at, created_at
    FROM darkroom_entities
    WHERE LOWER(name) = ${lower}
       OR EXISTS (
         SELECT 1 FROM unnest(aliases) AS alias
         WHERE LOWER(alias) = ${lower}
       )
    LIMIT 1
  `;
  return result.rows.length > 0 ? (result.rows[0] as Entity) : null;
}

/** @deprecated Use findEntityByName instead. */
export async function findDynamicEntity(
  name: string
): Promise<Entity | null> {
  return findEntityByName(name);
}

export async function upsertEntity(
  name: string,
  options: {
    aliases?: string[];
    source?: Entity["source"];
    entityType?: string;
    profile?: Record<string, unknown>;
    bumpMention?: boolean;
  } = {}
): Promise<Entity | null> {
  await ensureEntitiesTable();
  const sql = getSql();
  const {
    aliases = [],
    source = "user_mentioned",
    entityType = "person",
    profile = {},
    bumpMention = true,
  } = options;

  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return null;

  try {
    // Merge with existing aliases/profile if entity already exists.
    // Preserve the existing source for already-known entities so that
    // knowledge_base or user_mentioned sources are not downgraded to 'memory'
    // when they are later mentioned in extracted memories.
    const existing = await findEntityByName(trimmed);
    const mergedAliases = existing
      ? [...new Set([...existing.aliases, ...aliases, trimmed])].slice(0, 10)
      : [...new Set([...aliases, trimmed])].slice(0, 10);
    const mergedProfile = existing
      ? { ...existing.profile, ...profile }
      : { ...profile };
    const mergedSource = existing ? existing.source : source;

    // For newly created user_mentioned entities, set a default privacy TTL.
    // Currently disabled until the privacy feature set is explicitly enabled.
    if (PRIVACY_FEATURES_ENABLED && !existing && mergedSource === "user_mentioned") {
      const privacy = (mergedProfile.privacy as Record<string, unknown> | undefined) || {};
      mergedProfile.privacy = {
        consent: "implicit",
        ttl_days: 90,
        sensitive: false,
        ...privacy,
      };
    }

    const result = await sql`
      INSERT INTO darkroom_entities (name, aliases, source, entity_type, profile, mention_count, last_mentioned_at)
      VALUES (
        ${trimmed},
        ${mergedAliases},
        ${mergedSource},
        ${entityType},
        ${JSON.stringify(mergedProfile)},
        ${bumpMention ? 1 : 0},
        NOW()
      )
      ON CONFLICT (name) DO UPDATE SET
        aliases = EXCLUDED.aliases,
        source = EXCLUDED.source,
        entity_type = EXCLUDED.entity_type,
        profile = EXCLUDED.profile,
        mention_count = darkroom_entities.mention_count + ${bumpMention ? 1 : 0},
        last_mentioned_at = NOW(),
        updated_at = NOW()
      RETURNING id, name, aliases, source, entity_type, profile, mention_count, first_seen_at, last_mentioned_at, created_at
    `;
    return result.rows[0] as Entity;
  } catch (err) {
    console.error("[darkroom:memory] upsertEntity failed:", err);
    return null;
  }
}

/** @deprecated Use upsertEntity instead. */
export async function createDynamicEntity(
  name: string,
  aliases: string[] = [],
  source: Entity["source"] = "user_mentioned"
): Promise<Entity | null> {
  return upsertEntity(name, { aliases, source });
}

export async function recordMentionedNames(
  names: string[]
): Promise<void> {
  if (names.length === 0) return;
  await ensureEntitiesTable();
  const sql = getSql();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) continue;
    try {
      await sql`
        INSERT INTO darkroom_entities (name, aliases, source, entity_type, mention_count, last_mentioned_at)
        VALUES (${trimmed}, ${[]}, 'user_mentioned', 'person', 1, NOW())
        ON CONFLICT (name) DO UPDATE SET
          mention_count = darkroom_entities.mention_count + 1,
          last_mentioned_at = NOW(),
          updated_at = NOW()
      `;
    } catch (err) {
      console.error("[darkroom:memory] recordMentionedNames failed:", err);
    }
  }
}

export async function linkMemoryToEntities(
  memoryId: number,
  entityNames: string[],
  options: {
    subjectName?: string;
    confidence?: number;
    source?: Entity["source"];
  } = {}
): Promise<void> {
  const validNames = entityNames
    .map((n) => n.trim())
    .filter((n) => n.length >= 2);
  if (validNames.length === 0) return;

  await ensureMemoryEntitiesTable();
  const sql = getSql();
  const { subjectName, confidence = 0.8, source = "memory" } = options;

  const seen = new Set<number>();
  for (const name of validNames) {
    const entity = await upsertEntity(name, { source, bumpMention: false });
    if (!entity || seen.has(entity.id)) continue;
    seen.add(entity.id);

    const role: MemoryEntityRole =
      subjectName && name.toLowerCase() === subjectName.toLowerCase()
        ? "subject"
        : "mentioned";

    try {
      await sql`
        INSERT INTO darkroom_memory_entities (memory_id, entity_id, role, confidence)
        VALUES (${memoryId}, ${entity.id}, ${role}, ${confidence})
        ON CONFLICT (memory_id, entity_id, role) DO UPDATE SET
          confidence = EXCLUDED.confidence,
          created_at = NOW()
      `;
      // Also bump mention count on the entity.
      await sql`
        UPDATE darkroom_entities
        SET mention_count = mention_count + 1,
            last_mentioned_at = NOW(),
            updated_at = NOW()
        WHERE id = ${entity.id}
      `;
    } catch (err) {
      console.error("[darkroom:memory] linkMemoryToEntities failed:", err);
    }
  }
}

export async function recordEntityRelation(
  entityAName: string,
  entityBName: string,
  relationType: string,
  options: {
    evidenceMemoryId?: number;
    confidence?: number;
  } = {}
): Promise<EntityRelation | null> {
  const entityA = await findEntityByName(entityAName);
  const entityB = await findEntityByName(entityBName);
  if (!entityA || !entityB) return null;

  await ensureEntityRelationsTable();
  const sql = getSql();
  const { evidenceMemoryId, confidence = 0.7 } = options;

  try {
    const result = await sql`
      INSERT INTO darkroom_entity_relations (entity_a_id, entity_b_id, relation_type, evidence_memory_id, confidence)
      VALUES (${entityA.id}, ${entityB.id}, ${relationType}, ${evidenceMemoryId ?? null}, ${confidence})
      ON CONFLICT (entity_a_id, entity_b_id, relation_type) DO UPDATE SET
        evidence_memory_id = COALESCE(EXCLUDED.evidence_memory_id, darkroom_entity_relations.evidence_memory_id),
        confidence = GREATEST(EXCLUDED.confidence, darkroom_entity_relations.confidence),
        created_at = NOW()
      RETURNING id, entity_a_id, entity_b_id, relation_type, evidence_memory_id, confidence, created_at
    `;
    return result.rows[0] as EntityRelation;
  } catch (err) {
    console.error("[darkroom:memory] recordEntityRelation failed:", err);
    return null;
  }
}

export async function getEntityRelations(
  entityId: number
): Promise<EntityRelation[]> {
  await ensureEntityRelationsTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, entity_a_id, entity_b_id, relation_type, evidence_memory_id, confidence, created_at
    FROM darkroom_entity_relations
    WHERE entity_a_id = ${entityId} OR entity_b_id = ${entityId}
    ORDER BY confidence DESC, created_at DESC
  `;
  return result.rows as EntityRelation[];
}

export async function getMemoriesForEntity(
  entityId: number,
  limit: number = 10
): Promise<Memory[]> {
  await ensureMemoriesTable();
  await ensureMemoryEntitiesTable();
  const sql = getSql();
  const result = await sql`
    SELECT m.id, m.content, m.keywords, m.confidence, m.source_lang, m.memory_type, m.source_identity, m.created_at
    FROM darkroom_memories m
    JOIN darkroom_memory_entities me ON m.id = me.memory_id
    WHERE me.entity_id = ${entityId}
    ORDER BY
      CASE me.role WHEN 'subject' THEN 1 ELSE 2 END,
      m.confidence DESC,
      m.created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Memory[];
}

/** @deprecated Use getMemoriesForEntity instead. */
export async function retrieveMemoriesForEntity(
  entityId: number,
  limit: number = 10
): Promise<Memory[]> {
  return getMemoriesForEntity(entityId, limit);
}

export interface FormattedEntityRelation {
  relation_type: string;
  other_name: string;
}

export function buildEntityCard(
  entity: Entity,
  isZh: boolean,
  relations: FormattedEntityRelation[] = [],
  memories: Memory[] = []
): string {
  const lines: string[] = [];
  lines.push(isZh ? `[人物卡：${entity.name}]` : `[Person card: ${entity.name}]`);

  const profile = entity.profile || {};
  const description =
    typeof profile.description === "string" ? profile.description : undefined;
  if (description) {
    lines.push(isZh ? `- 身份：${description}` : `- Identity: ${description}`);
  } else if (memories.length > 0 || entity.mention_count > 0) {
    const sourceNote = isZh
      ? `- 身份：从 ${entity.mention_count || memories.length} 条聊天记忆中识别出的人物`
      : `- Identity: Recognized from ${entity.mention_count || memories.length} chat memories`;
    lines.push(sourceNote);
  }

  const knownFacts = Array.isArray(profile.known_facts)
    ? profile.known_facts.filter((f): f is string => typeof f === "string").slice(0, 5)
    : [];
  if (knownFacts.length > 0) {
    lines.push(
      isZh
        ? `- 已知事实：${knownFacts.join("；")}`
        : `- Known facts: ${knownFacts.join("; ")}`
    );
  }

  const relationshipHints =
    typeof profile.relationship_hints === "string" ? profile.relationship_hints : undefined;
  if (relationshipHints) {
    lines.push(
      isZh ? `- 关系线索：${relationshipHints}` : `- Relationship hints: ${relationshipHints}`
    );
  }

  if (relations.length > 0) {
    const relationLines = relations
      .slice(0, 3)
      .map((r) => `${r.other_name}（${r.relation_type}）`);
    lines.push(
      isZh
        ? `- 关系：${relationLines.join("、")}`
        : `- Relations: ${relationLines.join(", ")}`
    );
  }

  const preferences = Array.isArray(profile.preferences)
    ? profile.preferences.filter((p): p is string => typeof p === "string")
    : [];
  if (preferences.length > 0) {
    lines.push(
      isZh
        ? `- 偏好：${preferences.join("、")}`
        : `- Preferences: ${preferences.join(", ")}`
    );
  }

  if (memories.length > 0) {
    lines.push(isZh ? `- 近期记忆：` : `- Recent memories:`);
    for (const m of memories.slice(0, 3)) {
      lines.push(`  - ${m.content}`);
    }
  }

  return lines.join("\n");
}

export interface EntityPrivacy {
  consent?: "implicit" | "explicit" | "declined";
  ttl_days?: number;
  sensitive?: boolean;
}

export async function forgetEntity(name: string): Promise<boolean> {
  const entity = await findEntityByName(name);
  if (!entity) return false;

  await ensureEntitiesTable();
  const sql = getSql();
  const profile = {
    ...entity.profile,
    privacy: {
      ...(entity.profile?.privacy as Record<string, unknown> | undefined),
      consent: "declined",
    },
    description: undefined,
    preferences: undefined,
    known_facts: undefined,
    relationship_hints: undefined,
  };

  try {
    await sql`
      UPDATE darkroom_entities
      SET profile = ${JSON.stringify(profile)},
          updated_at = NOW()
      WHERE id = ${entity.id}
    `;
    // Also remove relations to protect privacy.
    await ensureEntityRelationsTable();
    await sql`
      DELETE FROM darkroom_entity_relations
      WHERE entity_a_id = ${entity.id} OR entity_b_id = ${entity.id}
    `;
    console.log(`[darkroom:memory] forgot entity: ${name}`);
    return true;
  } catch (err) {
    console.error("[darkroom:memory] forgetEntity failed:", err);
    return false;
  }
}

export async function pruneExpiredEntityProfiles(
  defaultTtlDays = 90
): Promise<number> {
  await ensureEntitiesTable();
  const sql = getSql();

  const result = await sql`
    UPDATE darkroom_entities
    SET profile = jsonb_build_object(
      'privacy',
      COALESCE(profile->'privacy', '{}'::jsonb) || jsonb_build_object('ttl_expired', true)
    ),
        updated_at = NOW()
    WHERE source = 'user_mentioned'
      AND (profile->'privacy'->>'consent' IS DISTINCT FROM 'declined')
      AND (
        (
          (profile->'privacy'->>'ttl_days')::int IS NULL
          AND last_mentioned_at < NOW() - ${defaultTtlDays} * INTERVAL '1 day'
        )
        OR
        (
          (profile->'privacy'->>'ttl_days')::int IS NOT NULL
          AND last_mentioned_at < NOW() - ((profile->'privacy'->>'ttl_days')::int) * INTERVAL '1 day'
        )
      )
  `;
  return result.rowCount ?? 0;
}

export async function getEntityNamesByIds(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  await ensureEntitiesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, name FROM darkroom_entities WHERE id = ANY(${ids}::int[])
  `;
  return new Map(
    (result.rows as Array<{ id: number; name: string }>).map((row) => [row.id, row.name])
  );
}

export async function getEntityById(id: number): Promise<Entity | null> {
  await ensureEntitiesTable();
  const sql = getSql();
  const result = await sql`
    SELECT id, name, aliases, source, entity_type, profile, mention_count, first_seen_at, last_mentioned_at, created_at
    FROM darkroom_entities
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows.length > 0 ? (result.rows[0] as Entity) : null;
}

export async function cleanupOldSessions(days: number): Promise<number> {
  await ensureSessionsTable();
  const sql = getSql();
  const result = await sql`
    DELETE FROM darkroom_sessions
    WHERE created_at < NOW() - ${days} * INTERVAL '1 day'
  `;
  return result.rowCount ?? 0;
}

export async function cleanupOldConversations(days: number): Promise<number> {
  await ensureConversationsTable();
  const sql = getSql();
  const result = await sql`
    DELETE FROM darkroom_conversations
    WHERE processed_for_memory = TRUE
      AND created_at < NOW() - ${days} * INTERVAL '1 day'
  `;
  return result.rowCount ?? 0;
}

export async function pruneMemoriesToTarget(targetCount: number = MAX_MEMORIES_TOTAL): Promise<number> {
  await ensureMemoriesTable();
  const sql = getSql();
  const countResult = await sql`SELECT COUNT(*) as count FROM darkroom_memories`;
  const count = Number((countResult.rows[0] as { count: number }).count);
  if (count <= targetCount) return 0;
  const toDelete = count - targetCount;
  const result = await sql`
    DELETE FROM darkroom_memories
    WHERE id IN (
      SELECT id FROM darkroom_memories
      ORDER BY confidence ASC, created_at ASC
      LIMIT ${toDelete}
    )
  `;
  return result.rowCount ?? 0;
}
