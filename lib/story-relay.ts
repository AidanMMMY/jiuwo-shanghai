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
  sessionId: string | null;
  segments: number[];
}

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.GUESTBOOK_POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
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
    sessionId: row.session_id as string | null,
    createdAt: row.created_at as string,
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
      story_zh, story_en, suggestion_1_zh, suggestion_1_en, suggestion_2_zh, suggestion_2_en, session_id
    ) VALUES (
      ${segment.sequence}, ${segment.authorName}, ${segment.userPrompt}, ${segment.aiQuestionZh}, ${segment.aiQuestionEn},
      ${segment.storyZh}, ${segment.storyEn}, ${segment.suggestion1Zh}, ${segment.suggestion1En}, ${segment.suggestion2Zh}, ${segment.suggestion2En}, ${segment.sessionId}
    )
    RETURNING *
  `;
  return rowToSegment((result.rows as Record<string, unknown>[])[0]);
}

export async function getNextSequence(): Promise<number> {
  const sql = getSql();
  const result = await sql`SELECT COALESCE(MAX(sequence), -1) + 1 AS next FROM story_relay_segments`;
  return (result.rows[0] as { next: number }).next;
}

export function buildContributors(segments: StorySegment[]): Contributor[] {
  const map = new Map<string, Contributor>();
  for (const seg of segments) {
    const key = seg.sessionId || seg.authorName;
    if (!map.has(key)) {
      map.set(key, { name: seg.authorName, sessionId: seg.sessionId, segments: [] });
    }
    map.get(key)!.segments.push(seg.sequence);
  }
  return Array.from(map.values());
}

export async function archiveCurrentChapter(): Promise<Chapter> {
  const sql = getSql();
  const segments = await getSegments();
  const chapterResult = await sql`SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next FROM story_relay_chapters`;
  const chapterNumber = (chapterResult.rows[0] as { next: number }).next;

  const result = await sql`
    INSERT INTO story_relay_chapters (chapter_number, segments_json)
    VALUES (${chapterNumber}, ${JSON.stringify(segments)})
    RETURNING *
  `;

  await sql`DELETE FROM story_relay_segments`;

  const row = (result.rows as Record<string, unknown>[])[0];
  return {
    id: row.id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: row.segments_json as unknown,
    createdAt: row.created_at as string,
    archivedAt: row.archived_at as string,
  };
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
    createdAt: row.created_at as string,
    archivedAt: row.archived_at as string,
  };
}

export async function getChapters(): Promise<Chapter[]> {
  const sql = getSql();
  const result = await sql`SELECT * FROM story_relay_chapters ORDER BY chapter_number DESC`;
  return (result.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as number,
    chapterNumber: row.chapter_number as number,
    segmentsJson: row.segments_json as unknown,
    createdAt: row.created_at as string,
    archivedAt: row.archived_at as string,
  }));
}
