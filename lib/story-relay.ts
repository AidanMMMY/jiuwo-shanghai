import { neon } from '@neondatabase/serverless';

export interface StorySegment {
  id: number;
  sequence: number;
  authorName: string;
  userPrompt: string | null;
  aiQuestionZh: string | null;
  aiQuestionEn: string | null;
  storyZh: string;
  storyEn: string;
  suggestion1Zh: string | null;
  suggestion1En: string | null;
  suggestion2Zh: string | null;
  suggestion2En: string | null;
  suggestion3Zh: string | null;
  suggestion3En: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface Chapter {
  id: number;
  chapterNumber: number;
  segmentsJson: unknown;
  createdAt: string;
  archivedAt: string;
}

export interface Contributor {
  name: string;
  segments: number[];
}

export interface StoryRelayCharacter {
  id: number;
  name: string;
  descriptionZh: string;
  descriptionEn: string;
  firstSegmentSequence: number;
  createdAt: string;
  updatedAt: string;
}

export function getSql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.GUESTBOOK_POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

function rowToSegment(row: Record<string, unknown>): StorySegment {
  return {
    id: row.id as number,
    sequence: row.sequence as number,
    authorName: row.author_name as string,
    userPrompt: row.user_prompt as string | null,
    aiQuestionZh: row.ai_question_zh as string | null,
    aiQuestionEn: row.ai_question_en as string | null,
    storyZh: row.story_zh as string,
    storyEn: row.story_en as string,
    suggestion1Zh: row.suggestion_1_zh as string | null,
    suggestion1En: row.suggestion_1_en as string | null,
    suggestion2Zh: row.suggestion_2_zh as string | null,
    suggestion2En: row.suggestion_2_en as string | null,
    suggestion3Zh: row.suggestion_3_zh as string | null,
    suggestion3En: row.suggestion_3_en as string | null,
    summaryZh: row.summary_zh as string | null,
    summaryEn: row.summary_en as string | null,
    sessionId: row.session_id as string | null,
    createdAt: toIsoString(row.created_at),
  };
}

export async function getSegments(): Promise<StorySegment[]> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_segments ORDER BY sequence ASC`;
  return (result.rows as Record<string, unknown>[]).map(rowToSegment);
}

export async function getLatestSegment(): Promise<StorySegment | null> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_segments ORDER BY sequence DESC LIMIT 1`;
  const rows = result.rows as Record<string, unknown>[];
  return rows.length > 0 ? rowToSegment(rows[0]) : null;
}

export async function insertSegment(segment: Omit<StorySegment, 'id' | 'createdAt'>): Promise<StorySegment> {
  const sql = getSql();
  const result = await sql`
    INSERT INTO story_relay_segments (
      sequence, author_name, user_prompt, ai_question_zh, ai_question_en,
      story_zh, story_en, suggestion_1_zh, suggestion_1_en, suggestion_2_zh, suggestion_2_en, suggestion_3_zh, suggestion_3_en, session_id
    ) VALUES (
      ${segment.sequence}, ${segment.authorName}, ${segment.userPrompt}, ${segment.aiQuestionZh}, ${segment.aiQuestionEn},
      ${segment.storyZh}, ${segment.storyEn}, ${segment.suggestion1Zh}, ${segment.suggestion1En}, ${segment.suggestion2Zh}, ${segment.suggestion2En}, ${segment.suggestion3Zh}, ${segment.suggestion3En}, ${segment.sessionId}
    )
    RETURNING *
  `;
  return rowToSegment((result.rows as Record<string, unknown>[])[0]);
}

export async function updateSegmentSummary(
  id: number,
  summaryZh: string,
  summaryEn: string
): Promise<StorySegment> {
  const sql = getSql();
  const result = await sql`
    UPDATE story_relay_segments
    SET summary_zh = ${summaryZh}, summary_en = ${summaryEn}
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToSegment((result.rows as Record<string, unknown>[])[0]);
}

export async function getRecentSummaries(limit: number = 4): Promise<
  { sequence: number; summaryZh: string; summaryEn: string }[]
> {
  const sql = getSql();
  const result = await sql`
    SELECT sequence, summary_zh, summary_en
    FROM story_relay_segments
    WHERE summary_zh IS NOT NULL AND summary_en IS NOT NULL
    ORDER BY sequence DESC
    LIMIT ${limit}
  `;
  return (result.rows as Record<string, unknown>[]).map((row) => ({
    sequence: row.sequence as number,
    summaryZh: row.summary_zh as string,
    summaryEn: row.summary_en as string,
  }));
}

export async function getNextSequence(): Promise<number> {
  const sql = getSql();
  const result = await sql`SELECT nextval('story_relay_segment_seq') AS next`;
  return (result.rows[0] as { next: number }).next;
}

export function buildPublicContributors(segments: StorySegment[]): Contributor[] {
  const map = new Map<string, Contributor>();
  for (const seg of segments) {
    const key = seg.sessionId || seg.authorName;
    if (!map.has(key)) {
      map.set(key, { name: seg.authorName, segments: [] });
    }
    map.get(key)!.segments.push(seg.sequence);
  }
  return Array.from(map.values());
}

export function sanitizeUserPrompt(prompt: string | null): string | null {
  if (!prompt) return null;
  const injectionPatterns = [/<system\b/i, /<instruction\b/i, /ignore previous/i, /forget all/i, /disregard/i];
  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) return null;
  }
  if (prompt.length > 500) return prompt.slice(0, 500) + '...';
  return prompt;
}

export function sanitizeSegmentForPublic(segment: StorySegment): Omit<StorySegment, 'sessionId'> {
  return {
    id: segment.id,
    sequence: segment.sequence,
    authorName: segment.authorName,
    userPrompt: sanitizeUserPrompt(segment.userPrompt),
    aiQuestionZh: segment.aiQuestionZh,
    aiQuestionEn: segment.aiQuestionEn,
    storyZh: segment.storyZh,
    storyEn: segment.storyEn,
    suggestion1Zh: segment.suggestion1Zh,
    suggestion1En: segment.suggestion1En,
    suggestion2Zh: segment.suggestion2Zh,
    suggestion2En: segment.suggestion2En,
    suggestion3Zh: segment.suggestion3Zh,
    suggestion3En: segment.suggestion3En,
    summaryZh: segment.summaryZh,
    summaryEn: segment.summaryEn,
    createdAt: segment.createdAt,
  };
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

function sanitizeSegmentsForArchive(segments: StorySegment[]): unknown[] {
  return segments.map((seg) => ({ ...seg, sessionId: null }));
}

export async function archiveCurrentChapter(): Promise<Chapter> {
  const sql = getSql();
  const segments = await getSegments();
  const segmentsJson = JSON.stringify(sanitizeSegmentsForArchive(segments));

  const result = await sql`
    WITH chapter_number AS (
      SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next FROM story_relay_chapters
    ),
    inserted AS (
      INSERT INTO story_relay_chapters (chapter_number, segments_json)
      SELECT chapter_number.next, ${segmentsJson}::jsonb
      FROM chapter_number
      RETURNING id, chapter_number, created_at, archived_at
    ),
    deleted_segments AS (
      DELETE FROM story_relay_segments RETURNING id
    ),
    deleted_chars AS (
      DELETE FROM story_relay_characters RETURNING id
    ),
    reset_seq AS (
      SELECT setval('story_relay_segment_seq', 0, false)
    )
    SELECT id, chapter_number, created_at, archived_at FROM inserted
  `;

  const row = (result.rows as Record<string, unknown>[])[0];
  return {
    id: row.id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: sanitizeSegmentsForArchive(segments),
    createdAt: toIsoString(row.created_at),
    archivedAt: toIsoString(row.archived_at),
  };
}

export async function archiveAndInsertOpening(
  newSegment: Omit<StorySegment, 'id' | 'createdAt' | 'sequence'>
): Promise<{ chapter: Chapter; segment: StorySegment }> {
  const sql = getSql();
  const segments = await getSegments();
  const segmentsJson = JSON.stringify(sanitizeSegmentsForArchive(segments));

  const result = await sql`
    WITH chapter_number AS (
      SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next FROM story_relay_chapters
    ),
    current_segments AS (
      SELECT ${segmentsJson}::jsonb AS segments_json
    ),
    inserted_chapter AS (
      INSERT INTO story_relay_chapters (chapter_number, segments_json)
      SELECT chapter_number.next, current_segments.segments_json
      FROM chapter_number, current_segments
      RETURNING id, chapter_number, created_at, archived_at
    ),
    deleted_segments AS (
      DELETE FROM story_relay_segments RETURNING id
    ),
    deleted_chars AS (
      DELETE FROM story_relay_characters RETURNING id
    ),
    reset_seq AS (
      SELECT setval('story_relay_segment_seq', 0, false)
    ),
    inserted_segment AS (
      INSERT INTO story_relay_segments (
        sequence, author_name, user_prompt, ai_question_zh, ai_question_en,
        story_zh, story_en, suggestion_1_zh, suggestion_1_en, suggestion_2_zh, suggestion_2_en, suggestion_3_zh, suggestion_3_en, session_id
      ) VALUES (
        nextval('story_relay_segment_seq'), ${newSegment.authorName}, ${newSegment.userPrompt}, ${newSegment.aiQuestionZh}, ${newSegment.aiQuestionEn},
        ${newSegment.storyZh}, ${newSegment.storyEn}, ${newSegment.suggestion1Zh}, ${newSegment.suggestion1En}, ${newSegment.suggestion2Zh}, ${newSegment.suggestion2En}, ${newSegment.suggestion3Zh}, ${newSegment.suggestion3En}, ${newSegment.sessionId}
      )
      RETURNING *
    )
    SELECT
      inserted_chapter.id AS chapter_id,
      inserted_chapter.chapter_number AS chapter_number,
      inserted_chapter.created_at AS chapter_created_at,
      inserted_chapter.archived_at AS chapter_archived_at,
      inserted_segment.*
    FROM inserted_chapter, inserted_segment
  `;

  const row = (result.rows as Record<string, unknown>[])[0];
  const chapter: Chapter = {
    id: row.chapter_id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: sanitizeSegmentsForArchive(segments),
    createdAt: toIsoString(row.chapter_created_at),
    archivedAt: toIsoString(row.chapter_archived_at),
  };
  const segment = rowToSegment(row);
  return { chapter, segment };
}

export async function getMemoriesForNameExtraction(limit: number = 100): Promise<{ content: string; confidence: number }[]> {
  const sql = getSql();
  const result = await sql`
    SELECT content, confidence
    FROM darkroom_memories
    WHERE confidence >= 0.6
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (result.rows as { content: string; confidence: number }[]).map((r) => ({
    content: r.content,
    confidence: typeof r.confidence === 'string' ? parseFloat(r.confidence) : r.confidence,
  }));
}

export async function getChapterByNumber(chapterNumber: number): Promise<Chapter | null> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_chapters WHERE chapter_number = ${chapterNumber}`;
  const rows = result.rows as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: row.segments_json as unknown,
    createdAt: toIsoString(row.created_at),
    archivedAt: toIsoString(row.archived_at),
  };
}

export async function getChapters(): Promise<Chapter[]> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_chapters ORDER BY chapter_number DESC`;
  return (result.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: row.segments_json as unknown,
    createdAt: toIsoString(row.created_at),
    archivedAt: toIsoString(row.archived_at),
  }));
}

export async function getCharacters(): Promise<StoryRelayCharacter[]> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_characters ORDER BY first_segment_sequence ASC, id ASC`;
  return (result.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as number,
    name: row.name as string,
    descriptionZh: row.description_zh as string,
    descriptionEn: row.description_en as string,
    firstSegmentSequence: row.first_segment_sequence as number,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }));
}

export async function upsertCharacter(
  name: string,
  descriptionZh: string,
  descriptionEn: string,
  firstSegmentSequence: number
): Promise<StoryRelayCharacter> {
  const sql = getSql();
  const result = await sql`
    INSERT INTO story_relay_characters (name, description_zh, description_en, first_segment_sequence)
    VALUES (${name}, ${descriptionZh}, ${descriptionEn}, ${firstSegmentSequence})
    ON CONFLICT (name) DO UPDATE SET
      description_zh = EXCLUDED.description_zh,
      description_en = EXCLUDED.description_en,
      updated_at = NOW()
    RETURNING *
  `;
  const row = (result.rows as Record<string, unknown>[])[0];
  return {
    id: row.id as number,
    name: row.name as string,
    descriptionZh: row.description_zh as string,
    descriptionEn: row.description_en as string,
    firstSegmentSequence: row.first_segment_sequence as number,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function deleteAllCharacters(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM story_relay_characters`;
}
