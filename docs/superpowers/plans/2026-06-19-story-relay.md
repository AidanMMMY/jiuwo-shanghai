# 啾喔故事接力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 JIUWO 啾喔网站的故事接力彩蛋功能：AI 起头、用户续写、公共接龙、双语输出、测试期通过秘密路径访问。

**Architecture:** 后端复用 Neon Postgres 与 DeepSeek API，新增两张表持久化故事段落与归档章节；前端为独立的 Next.js 页面，桌面端用右侧 contributor 时间线，移动端用底部可折叠墙。

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Neon Postgres, DeepSeek API (OpenAI SDK), Vitest, Zod.

---

## File Map

| 文件 | 职责 |
|---|---|
| `migrations/006_story_relay.sql` | 创建 `story_relay_segments` 和 `story_relay_chapters` 表 |
| `data/story-relay-seeds.json` | 保底人名与故事种子 |
| `lib/story-relay.ts` | 数据库 CRUD、segment 聚合、归档逻辑 |
| `lib/story-relay-ai.ts` | AI prompt 构建、DeepSeek 调用、JSON 解析、内容尺度初筛 |
| `lib/story-relay.test.ts` | story-relay 工具函数与 AI 解析单元测试 |
| `app/api/story-relay/state/route.ts` | 获取当前故事状态 |
| `app/api/story-relay/continue/route.ts` | 用户续写接口 |
| `app/api/story-relay/reset/route.ts` | 管理员重置/归档接口 |
| `app/api/story-relay/chapters/route.ts` | 历史归档列表 |
| `app/story-relay/page.tsx` | 故事接力页面（含 token 校验） |
| `components/StoryRelayTerminal.tsx` | 故事流、输入区、contributor 时间线/墙 |
| `components/StoryRelaySegment.tsx` | 单段故事渲染 |
| `components/StoryRelayInput.tsx` | 姓名 + 输入 + 建议方向按钮 |
| `components/StoryRelayContributors.tsx` | contributor 时间线（桌面）/ 折叠墙（移动） |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/006_story_relay.sql`
- Test: `npm run typecheck` (after applying locally)

- [ ] **Step 1: Write migration**

```sql
-- migrations/006_story_relay.sql
CREATE TABLE IF NOT EXISTS story_relay_segments (
  id SERIAL PRIMARY KEY,
  sequence INTEGER NOT NULL,
  author_name VARCHAR(64) NOT NULL,
  user_prompt TEXT,
  ai_question_zh TEXT,
  ai_question_en TEXT,
  story_zh TEXT NOT NULL,
  story_en TEXT NOT NULL,
  suggestion_1_zh TEXT,
  suggestion_1_en TEXT,
  suggestion_2_zh TEXT,
  suggestion_2_en TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_relay_segments_sequence
  ON story_relay_segments(sequence);

CREATE INDEX IF NOT EXISTS idx_story_relay_segments_session_id
  ON story_relay_segments(session_id);

CREATE TABLE IF NOT EXISTS story_relay_chapters (
  id SERIAL PRIMARY KEY,
  chapter_number INTEGER NOT NULL UNIQUE,
  segments_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Apply migration to local/dev database**

Run:
```bash
psql $POSTGRES_URL -f migrations/006_story_relay.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX` success messages.

- [ ] **Step 3: Commit**

```bash
git add migrations/006_story_relay.sql
git commit -m "feat(story-relay): add segments and chapters tables"
```

---

## Task 2: Seed Data

**Files:**
- Create: `data/story-relay-seeds.json`

- [ ] **Step 1: Create seed file**

```json
{
  "fallbackNames": [
    "Aidan",
    "老王",
    "小夏",
    "Leo",
    "阿杰",
    "Mina",
    "东东",
    "Evan"
  ],
  "openingThemes": [
    "一个雨夜，有人推开了 JIUWO 的门",
    "深夜两点，吧台边还剩最后两盏灯",
    "周末的啾喔格外热闹，角落里坐着一个陌生面孔"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add data/story-relay-seeds.json
git commit -m "feat(story-relay): add fallback name seeds"
```

---

## Task 3: Data Layer

**Files:**
- Create: `lib/story-relay.ts`
- Create: `lib/story-relay.test.ts`

- [ ] **Step 1: Write the data layer interface test**

```typescript
// lib/story-relay.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { neon } from '@neondatabase/serverless';

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(),
}));

describe('story-relay data layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSegments returns rows ordered by sequence', async () => {
    const mockSql = vi.fn().mockResolvedValue({ rows: [{ sequence: 0 }, { sequence: 1 }] });
    (neon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSql);

    const { getSegments } = await import('./story-relay');
    const result = await getSegments();
    expect(result).toHaveLength(2);
    expect(result[0].sequence).toBe(0);
  });

  it('buildContributors groups segments by author', () => {
    const { buildContributors } = require('./story-relay');
    const segments = [
      { sequence: 0, authorName: 'AI', sessionId: 'ai' },
      { sequence: 1, authorName: '小明', sessionId: 's1' },
      { sequence: 2, authorName: '小红', sessionId: 's2' },
      { sequence: 3, authorName: '小明', sessionId: 's1' },
    ];
    const contributors = buildContributors(segments);
    expect(contributors).toEqual([
      { name: 'AI', sessionId: 'ai', segments: [0] },
      { name: '小明', sessionId: 's1', segments: [1, 3] },
      { name: '小红', sessionId: 's2', segments: [2] },
    ]);
  });
});
```

Run:
```bash
npm run test -- lib/story-relay.test.ts
```

Expected: FAIL with "Cannot find module" or "getSegments is not a function".

- [ ] **Step 2: Implement data layer**

```typescript
// lib/story-relay.ts
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
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
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
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- lib/story-relay.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/story-relay.ts lib/story-relay.test.ts
git commit -m "feat(story-relay): add data layer and tests"
```

---

## Task 4: AI Layer

**Files:**
- Create: `lib/story-relay-ai.ts`
- Modify: `lib/story-relay.test.ts` (add AI parsing tests)

- [ ] **Step 1: Add AI parsing tests**

Append to `lib/story-relay.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { safeJsonParse, extractNamesFromMemories, OPENING_PROMPT } from './story-relay-ai';

describe('story-relay-ai', () => {
  it('safeJsonParse extracts JSON from markdown fences', () => {
    const raw = '```json\n{"storyZh":"中文","storyEn":"en"}\n```';
    const parsed = safeJsonParse(raw);
    expect(parsed).toEqual({ storyZh: '中文', storyEn: 'en' });
  });

  it('extractNamesFromMemories returns unique names', () => {
    const memories = [
      { content: '小明和老王常来喝酒', confidence: 0.8 },
      { content: 'Leo 喜欢坐吧台', confidence: 0.9 },
      { content: '今天天气不错', confidence: 0.7 },
    ];
    const names = extractNamesFromMemories(memories, ['保底']);
    expect(names).toContain('小明');
    expect(names).toContain('老王');
    expect(names).toContain('Leo');
    expect(names).toContain('保底');
  });

  it('OPENING_PROMPT contains required keys', () => {
    expect(OPENING_PROMPT).toContain('storyZh');
    expect(OPENING_PROMPT).toContain('suggestion1Zh');
  });
});
```

Run:
```bash
npm run test -- lib/story-relay.test.ts
```

Expected: FAIL.

- [ ] **Step 2: Implement AI layer**

```typescript
// lib/story-relay-ai.ts
import { deepseekClient, DEFAULT_MODEL } from './deepseek/client';
import { safeJsonParse } from './darkroom-chat';
import seeds from '../data/story-relay-seeds.json';

export interface StoryRelayResponse {
  storyZh: string;
  storyEn: string;
  questionZh: string;
  questionEn: string;
  suggestion1Zh: string;
  suggestion1En: string;
  suggestion2Zh: string;
  suggestion2En: string;
}

export const OPENING_PROMPT = `你是 JIUWO（啾喔）酒吧的驻场 storyteller。请用以下人名：{names}，围绕酒吧写一段 300-500 字的开头。
要求：
1. 场景在上海巨鹿路 397 号的 JIUWO 酒吧。
2. 风格温暖、神秘、有社群感。
3. 结尾提出一个开放性问题。
4. 给出两个建议方向。
5. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
6. 中英文都要自然、有文学感，不要直译。
7. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。`;

export const CONTINUE_PROMPT = `你是 JIUWO（啾喔）酒吧的驻场 storyteller。酒吧位于上海巨鹿路 397 号，氛围像"朋友的客厅"。
请用以下人名作为故事角色：{names}
当前故事已有 {n} 段。上一段结尾的问题是：{latestQuestion}
用户的回答是：{userInput}
要求：
1. 续写 300-500 字，保持酒吧场景和社群感。
2. 结尾提出一个开放性问题，推动剧情。
3. 同时给出两个简短的剧情建议方向（A / B）。
4. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
5. 中英文都要自然、有文学感，不要直译。
6. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。`;

const OUTPUT_SCHEMA = `{ "storyZh": "...", "storyEn": "...", "questionZh": "...", "questionEn": "...", "suggestion1Zh": "...", "suggestion1En": "...", "suggestion2Zh": "...", "suggestion2En": "..." }`;

export function buildOpeningPrompt(names: string[]): string {
  return OPENING_PROMPT.replace('{names}', names.join('、'));
}

export function buildContinuePrompt(
  names: string[],
  n: number,
  latestQuestion: string,
  userInput: string
): string {
  return CONTINUE_PROMPT
    .replace('{names}', names.join('、'))
    .replace('{n}', String(n))
    .replace('{latestQuestion}', latestQuestion)
    .replace('{userInput}', userInput);
}

export function parseStoryRelayResponse(raw: string): StoryRelayResponse | null {
  const parsed = safeJsonParse(raw);
  if (!parsed) return null;
  const keys: (keyof StoryRelayResponse)[] = [
    'storyZh', 'storyEn', 'questionZh', 'questionEn',
    'suggestion1Zh', 'suggestion1En', 'suggestion2Zh', 'suggestion2En',
  ];
  for (const key of keys) {
    if (typeof parsed[key] !== 'string') return null;
  }
  return parsed as StoryRelayResponse;
}

export function isContentAllowed(storyZh: string, storyEn: string): { allowed: boolean; reason?: string } {
  const forbiddenZh = ['强奸', '猥亵', '性侵', '未成年人', '儿童'];
  const forbiddenEn = ['rape', 'molest', 'minor', 'child', 'underage'];
  const combined = (storyZh + ' ' + storyEn).toLowerCase();
  for (const word of forbiddenZh) {
    if (combined.includes(word)) return { allowed: false, reason: '包含不允许的敏感内容' };
  }
  for (const word of forbiddenEn) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(combined)) return { allowed: false, reason: '包含不允许的敏感内容' };
  }
  return { allowed: true };
}

interface MemoryLike {
  content: string;
  confidence: number;
}

const COMMON_ZH_SURNAMES = new Set([
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林',
  '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程', '曹',
  '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛',
  '叶', '阎', '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜', '范', '方', '石', '姚',
  '谭', '廖', '邹', '熊', '金', '陆', '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史',
  '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤', '尹', '黎', '易', '常', '武', '乔',
  '贺', '赖', '龚', '文', '小', '老', '阿',
]);

const EN_NAME_STOPWORDS = new Set([
  'The', 'A', 'An', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Being', 'Have', 'Has', 'Had', 'Do', 'Does', 'Did',
  'Will', 'Would', 'Could', 'Should', 'May', 'Might', 'Must', 'Shall', 'Can', 'Need', 'Used', 'To', 'Of', 'In',
  'For', 'On', 'With', 'At', 'By', 'From', 'As', 'Into', 'Through', 'During', 'Before', 'After', 'Above', 'Below',
  'Between', 'Under', 'Again', 'Further', 'Then', 'Once', 'Here', 'There', 'When', 'Where', 'Why', 'How', 'All',
  'Any', 'Both', 'Each', 'Few', 'More', 'Most', 'Other', 'Some', 'Such', 'No', 'Nor', 'Not', 'Only', 'Own', 'Same',
  'So', 'Than', 'Too', 'Very', 'Just', 'And', 'But', 'If', 'Or', 'Because', 'Until', 'While', 'This', 'That',
  'These', 'Those', 'I', 'Me', 'My', 'Myself', 'We', 'Our', 'Ours', 'Ourselves', 'You', 'Your', 'Yours', 'Yourself',
  'Yourselves', 'He', 'Him', 'His', 'Himself', 'She', 'Her', 'Hers', 'Herself', 'It', 'Its', 'Itself', 'They',
  'Them', 'Their', 'Theirs', 'Themselves', 'What', 'Which', 'Who', 'Whom', 'Whose', 'Am', 'Ji', 'Jiu', 'Wo',
]);

function isLikelyZhName(name: string): boolean {
  if (name.length < 2 || name.length > 4) return false;
  return COMMON_ZH_SURNAMES.has(name[0]);
}

export function extractNamesFromMemories(memories: MemoryLike[], fallbackNames: string[] = seeds.fallbackNames): string[] {
  const zhNameRegex = /[一-龥]{2,4}/g;
  const enNameRegex = /\b[A-Z][a-z]{1,10}\b/g;
  const candidates = new Map<string, number>();

  for (const m of memories) {
    const zhMatches = (m.content.match(zhNameRegex) || []).filter(isLikelyZhName);
    const enMatches = (m.content.match(enNameRegex) || []).filter((name) => {
      return !EN_NAME_STOPWORDS.has(name) && name.length >= 2 && name.length <= 10;
    });
    for (const name of [...zhMatches, ...enMatches]) {
      const score = (candidates.get(name) || 0) + m.confidence;
      candidates.set(name, score);
    }
  }

  const sorted = Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5);

  if (sorted.length < 3) {
    const needed = 3 - sorted.length;
    for (const name of fallbackNames) {
      if (!sorted.includes(name)) sorted.push(name);
      if (sorted.length >= 3) break;
    }
  }

  return sorted.slice(0, 5);
}

export async function generateStoryOpening(names: string[]): Promise<StoryRelayResponse> {
  const prompt = buildOpeningPrompt(names);
  const completion = await deepseekClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: 'You are a bilingual storyteller. Always respond with valid JSON matching the requested schema.' },
      { role: 'user', content: prompt + '\n\n必须输出 JSON：' + OUTPUT_SCHEMA },
    ],
    temperature: 0.85,
  });

  const raw = completion.choices[0]?.message?.content || '';
  const parsed = parseStoryRelayResponse(raw);
  if (!parsed) throw new Error('Failed to parse opening response: ' + raw);
  return parsed;
}

export async function generateStoryContinuation(
  names: string[],
  segmentCount: number,
  latestQuestion: string,
  userInput: string
): Promise<StoryRelayResponse> {
  const prompt = buildContinuePrompt(names, segmentCount, latestQuestion, userInput);
  const completion = await deepseekClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: 'You are a bilingual storyteller. Always respond with valid JSON matching the requested schema.' },
      { role: 'user', content: prompt + '\n\n必须输出 JSON：' + OUTPUT_SCHEMA },
    ],
    temperature: 0.85,
  });

  const raw = completion.choices[0]?.message?.content || '';
  const parsed = parseStoryRelayResponse(raw);
  if (!parsed) throw new Error('Failed to parse continuation response: ' + raw);

  const check = isContentAllowed(parsed.storyZh, parsed.storyEn);
  if (!check.allowed) {
    throw new Error('CONTENT_BLOCKED:' + check.reason);
  }

  return parsed;
}
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- lib/story-relay.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/story-relay-ai.ts lib/story-relay.test.ts data/story-relay-seeds.json
git commit -m "feat(story-relay): add AI layer with prompts and parsing"
```

---

## Task 5: API Routes

**Files:**
- Create: `app/api/story-relay/state/route.ts`
- Create: `app/api/story-relay/continue/route.ts`
- Create: `app/api/story-relay/reset/route.ts`
- Create: `app/api/story-relay/chapters/route.ts`

- [ ] **Step 1: Implement state route**

```typescript
// app/api/story-relay/state/route.ts
import { NextResponse } from 'next/server';
import { getSegments, buildContributors } from '@/lib/story-relay';

export async function GET() {
  try {
    const segments = await getSegments();
    const contributors = buildContributors(segments);
    const latest = segments[segments.length - 1];

    return NextResponse.json({
      segments: segments.map((s) => ({
        sequence: s.sequence,
        authorName: s.authorName,
        userPrompt: s.userPrompt,
        storyZh: s.storyZh,
        storyEn: s.storyEn,
        aiQuestionZh: s.aiQuestionZh,
        aiQuestionEn: s.aiQuestionEn,
        suggestion1Zh: s.suggestion1Zh,
        suggestion1En: s.suggestion1En,
        suggestion2Zh: s.suggestion2Zh,
        suggestion2En: s.suggestion2En,
      })),
      latestQuestion: latest
        ? { zh: latest.aiQuestionZh, en: latest.aiQuestionEn }
        : null,
      latestSuggestions: latest
        ? [
            { zh: latest.suggestion1Zh, en: latest.suggestion1En },
            { zh: latest.suggestion2Zh, en: latest.suggestion2En },
          ]
        : [],
      contributors,
    });
  } catch (err) {
    console.error('story-relay/state error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement continue route**

```typescript
// app/api/story-relay/continue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  getLatestSegment,
  getNextSequence,
  insertSegment,
  buildContributors,
  getMemoriesForNameExtraction,
} from '@/lib/story-relay';
import { generateStoryContinuation, extractNamesFromMemories } from '@/lib/story-relay-ai';

const continueSchema = z.object({
  authorName: z.string().min(1).max(64),
  userInput: z.string().min(1).max(2000),
  token: z.string(),
});

const STORY_RELAY_TOKEN = process.env.STORY_RELAY_TOKEN || 'jiuwo';

function getOrCreateSessionId(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get('story_relay_session_id')?.value;
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  cookieStore.set('story_relay_session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return sessionId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = continueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { authorName, userInput, token } = parsed.data;
    if (token !== STORY_RELAY_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessionId = getOrCreateSessionId();
    const latest = await getLatestSegment();
    if (!latest) {
      return NextResponse.json({ error: 'No active story' }, { status: 400 });
    }

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);

    const segments = await getSegments();
    const latestQuestion = latest.aiQuestionZh || latest.aiQuestionEn || '';
    const generated = await generateStoryContinuation(
      names,
      segments.length,
      latestQuestion,
      userInput
    );

    const nextSequence = await getNextSequence();
    const newSegment = await insertSegment({
      sequence: nextSequence,
      authorName,
      userPrompt: userInput,
      aiQuestionZh: latest.aiQuestionZh || null,
      aiQuestionEn: latest.aiQuestionEn || null,
      storyZh: generated.storyZh,
      storyEn: generated.storyEn,
      suggestion1Zh: generated.suggestion1Zh,
      suggestion1En: generated.suggestion1En,
      suggestion2Zh: generated.suggestion2Zh,
      suggestion2En: generated.suggestion2En,
      sessionId,
    });

    const allSegments = [...segments, newSegment];
    return NextResponse.json({
      segment: {
        sequence: newSegment.sequence,
        authorName: newSegment.authorName,
        storyZh: newSegment.storyZh,
        storyEn: newSegment.storyEn,
        aiQuestionZh: newSegment.aiQuestionZh,
        aiQuestionEn: newSegment.aiQuestionEn,
        suggestion1Zh: newSegment.suggestion1Zh,
        suggestion1En: newSegment.suggestion1En,
        suggestion2Zh: newSegment.suggestion2Zh,
        suggestion2En: newSegment.suggestion2En,
      },
      contributors: buildContributors(allSegments),
    });
  } catch (err) {
    console.error('story-relay/continue error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('CONTENT_BLOCKED')) {
      return NextResponse.json(
        { error: 'AI 觉得这一段写得太直白了，啾喔的故事更喜欢用氛围和隐喻来说。换一种含蓄点的写法？' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'AI 走神了，请重试' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement reset route**

```typescript
// app/api/story-relay/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { archiveCurrentChapter, insertSegment, getNextSequence, getMemoriesForNameExtraction } from '@/lib/story-relay';
import { generateStoryOpening, extractNamesFromMemories } from '@/lib/story-relay-ai';

const resetSchema = z.object({
  token: z.string(),
});

const STORY_RELAY_ADMIN_TOKEN = process.env.STORY_RELAY_ADMIN_TOKEN || 'admin-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (parsed.data.token !== STORY_RELAY_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const chapter = await archiveCurrentChapter();

    const memoryRows = await getMemoriesForNameExtraction(100);
    const names = extractNamesFromMemories(memoryRows);
    const generated = await generateStoryOpening(names);

    const sequence = await getNextSequence();
    const segment = await insertSegment({
      sequence,
      authorName: 'AI',
      userPrompt: null,
      aiQuestionZh: null,
      aiQuestionEn: null,
      storyZh: generated.storyZh,
      storyEn: generated.storyEn,
      suggestion1Zh: generated.suggestion1Zh,
      suggestion1En: generated.suggestion1En,
      suggestion2Zh: generated.suggestion2Zh,
      suggestion2En: generated.suggestion2En,
      sessionId: null,
    });

    return NextResponse.json({ chapter, segment });
  } catch (err) {
    console.error('story-relay/reset error:', err);
    return NextResponse.json({ error: 'Failed to reset story' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement chapters route**

```typescript
// app/api/story-relay/chapters/route.ts
import { NextResponse } from 'next/server';
import { getChapters } from '@/lib/story-relay';

export async function GET() {
  try {
    const chapters = await getChapters();
    return NextResponse.json({
      chapters: chapters.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        createdAt: c.createdAt,
        archivedAt: c.archivedAt,
        segmentCount: Array.isArray(c.segmentsJson) ? c.segmentsJson.length : 0,
      })),
    });
  } catch (err) {
    console.error('story-relay/chapters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (fix any import/type errors).

- [ ] **Step 6: Commit**

```bash
git add app/api/story-relay app/story-relay components package.json package-lock.json lib/story-relay.ts lib/story-relay-ai.ts
# (only add files that actually exist/changed)
git commit -m "feat(story-relay): add API routes for state, continue, reset, chapters"
```

---

## Task 6: Frontend Page & Components

**Files:**
- Create: `app/story-relay/page.tsx`
- Create: `components/StoryRelayTerminal.tsx`
- Create: `components/StoryRelaySegment.tsx`
- Create: `components/StoryRelayInput.tsx`
- Create: `components/StoryRelayContributors.tsx`

- [ ] **Step 1: Implement segment component**

```tsx
// components/StoryRelaySegment.tsx
interface Segment {
  sequence: number;
  authorName: string;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
}

export function StoryRelaySegment({ segment, isLatest }: { segment: Segment; isLatest?: boolean }) {
  return (
    <div className="mb-8 border-l-2 border-[#2a2a2a] pl-5 last:mb-0">
      <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">
        {segment.authorName} {segment.sequence === 0 ? '起头' : '续写'} · 第 {segment.sequence} 段
      </div>
      <p className="mb-4 text-lg leading-relaxed text-[#f5f5f0]">{segment.storyZh}</p>
      <p className="mb-4 text-base leading-relaxed text-[#888]">{segment.storyEn}</p>
      {isLatest && segment.aiQuestionZh && (
        <div className="rounded border border-[#2a2a2a] bg-[#151515] p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-[#888]">AI 提问</div>
          <p className="mb-2 text-lg text-[#f5f5f0]">{segment.aiQuestionZh}</p>
          <p className="text-base text-[#888]">{segment.aiQuestionEn}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement contributors component**

```tsx
// components/StoryRelayContributors.tsx
'use client';

import { useState } from 'react';

interface Contributor {
  name: string;
  segments: number[];
}

export function StoryRelayContributors({ contributors, isMobile }: { contributors: Contributor[]; isMobile?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (isMobile) {
    return (
      <div className="mt-8 border-t border-[#2a2a2a] pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-3 text-xs uppercase tracking-widest text-[#c9a227]"
        >
          Contributors {expanded ? '▲' : '▼'}
        </button>
        {expanded && (
          <div className="space-y-3">
            {contributors.map((c) => (
              <div key={c.name} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#c9a227]" />
                <div>
                  <div className="text-sm text-[#f5f5f0]">{c.name}</div>
                  <div className="text-xs text-[#888]">段 {c.segments.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
      <div className="mb-4 text-xs uppercase tracking-widest text-[#c9a227]">Contributors</div>
      <div className="space-y-3">
        {contributors.map((c) => (
          <div key={c.name} className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#c9a227]" />
            <div>
              <div className="text-sm text-[#f5f5f0]">{c.name}</div>
              <div className="text-xs text-[#888]">段 {c.segments.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement input component**

```tsx
// components/StoryRelayInput.tsx
'use client';

import { useState } from 'react';

interface StoryRelayInputProps {
  latestQuestion: { zh: string | null; en: string | null } | null;
  suggestions: { zh: string | null; en: string | null }[];
  onSubmit: (authorName: string, userInput: string) => void;
  disabled?: boolean;
}

export function StoryRelayInput({ latestQuestion, suggestions, onSubmit, disabled }: StoryRelayInputProps) {
  const [authorName, setAuthorName] = useState('');
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !userInput.trim()) return;
    onSubmit(authorName.trim(), userInput.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-5">
      <div className="mb-3 text-xs uppercase tracking-widest text-[#888]">轮到你了</div>
      {latestQuestion && (
        <div className="mb-4">
          <p className="text-lg text-[#f5f5f0]">{latestQuestion.zh}</p>
          <p className="text-base text-[#888]">{latestQuestion.en}</p>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s, idx) =>
          s.zh ? (
            <button
              key={idx}
              type="button"
              onClick={() => setUserInput(s.zh || '')}
              className="rounded border border-[#3a3a3a] px-3 py-1 text-sm text-[#c9a227] hover:border-[#c9a227]"
            >
              {String.fromCharCode(65 + idx)}. {s.zh}
            </button>
          ) : null
        )}
      </div>
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="你的名字（首次提交后将很难更改）"
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="回答 AI 的问题，或提出你的要求..."
        rows={4}
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !authorName.trim() || !userInput.trim()}
        className="rounded bg-[#c9a227] px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
      >
        {disabled ? '续写中...' : '续写故事'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Implement terminal component**

```tsx
// components/StoryRelayTerminal.tsx
'use client';

import { useState, useCallback } from 'react';
import { StoryRelaySegment } from './StoryRelaySegment';
import { StoryRelayContributors } from './StoryRelayContributors';
import { StoryRelayInput } from './StoryRelayInput';

interface Segment {
  sequence: number;
  authorName: string;
  userPrompt?: string | null;
  storyZh: string;
  storyEn: string;
  aiQuestionZh?: string | null;
  aiQuestionEn?: string | null;
  suggestion1Zh?: string | null;
  suggestion1En?: string | null;
  suggestion2Zh?: string | null;
  suggestion2En?: string | null;
}

interface Contributor {
  name: string;
  segments: number[];
}

interface StoryRelayTerminalProps {
  initialSegments: Segment[];
  initialContributors: Contributor[];
  token: string;
}

export function StoryRelayTerminal({ initialSegments, initialContributors, token }: StoryRelayTerminalProps) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestSegment = segments[segments.length - 1];
  const latestQuestion = latestSegment
    ? { zh: latestSegment.aiQuestionZh || null, en: latestSegment.aiQuestionEn || null }
    : null;
  const latestSuggestions = latestSegment
    ? [
        { zh: latestSegment.suggestion1Zh || null, en: latestSegment.suggestion1En || null },
        { zh: latestSegment.suggestion2Zh || null, en: latestSegment.suggestion2En || null },
      ]
    : [];

  const handleSubmit = useCallback(
    async (authorName: string, userInput: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/story-relay/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorName, userInput, token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '续写失败');
        }
        setSegments((prev) => [...prev, data.segment]);
        setContributors(data.contributors);
      } catch (err) {
        setError(err instanceof Error ? err.message : '续写失败');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="mb-8 text-2xl font-semibold tracking-wide text-[#c9a227]">啾喔故事接力</h1>

      <div className="mb-8">
        {segments.map((segment, idx) => (
          <StoryRelaySegment key={segment.sequence} segment={segment} isLatest={idx === segments.length - 1} />
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <StoryRelayInput
        latestQuestion={latestQuestion}
        suggestions={latestSuggestions}
        onSubmit={handleSubmit}
        disabled={loading}
      />

      <div className="lg:hidden">
        <StoryRelayContributors contributors={contributors} isMobile />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement page**

```tsx
// app/story-relay/page.tsx
import { notFound } from 'next/navigation';
import { getSegments, buildContributors } from '@/lib/story-relay';
import { StoryRelayTerminal } from '@/components/StoryRelayTerminal';
import { StoryRelayContributors } from '@/components/StoryRelayContributors';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function StoryRelayPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const expectedToken = process.env.STORY_RELAY_TOKEN || 'jiuwo';

  if (token !== expectedToken) {
    notFound();
  }

  const segments = await getSegments();
  const contributors = buildContributors(segments);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-[#f5f5f0]">
      <div className="mx-auto flex max-w-6xl gap-8">
        <StoryRelayTerminal
          initialSegments={segments}
          initialContributors={contributors}
          token={token}
        />
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <StoryRelayContributors contributors={contributors} />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (fix any type errors).

- [ ] **Step 7: Run dev server smoke test**

```bash
npm run dev
```

In another terminal:
```bash
curl "http://localhost:3000/story-relay?token=jiuwo"
```

Expected: HTML response (not 404).

- [ ] **Step 8: Commit**

```bash
git add app/story-relay components/StoryRelayTerminal.tsx components/StoryRelaySegment.tsx components/StoryRelayInput.tsx components/StoryRelayContributors.tsx
git commit -m "feat(story-relay): add frontend page and components"
```

---

## Task 7: Integration & Manual Testing

**Files:**
- Modify: `.env.local` (add tokens)

- [ ] **Step 1: Add environment variables**

```bash
# .env.local
STORY_RELAY_TOKEN=jiuwo
STORY_RELAY_ADMIN_TOKEN=your-admin-token-here
```

- [ ] **Step 2: Test reset and opening**

```bash
curl -X POST http://localhost:3000/api/story-relay/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"your-admin-token-here"}'
```

Expected: JSON with new opening segment.

- [ ] **Step 3: Test state endpoint**

```bash
curl http://localhost:3000/api/story-relay/state
```

Expected: JSON with segments and contributors.

- [ ] **Step 4: Test continue endpoint**

```bash
curl -X POST http://localhost:3000/api/story-relay/continue \
  -H "Content-Type: application/json" \
  -d '{"authorName":"小明","userInput":"我觉得主角应该留下来","token":"jiuwo"}' \
  -c cookies.txt -b cookies.txt
```

Expected: JSON with new segment.

- [ ] **Step 5: Verify concurrency behavior**

Open two terminals and run the continue curl nearly simultaneously. One should succeed, the other may fail with a 500/refresh message.

- [ ] **Step 6: Test content moderation**

```bash
curl -X POST http://localhost:3000/api/story-relay/continue \
  -H "Content-Type: application/json" \
  -d '{"authorName":"test","userInput":"写一段非常直白的色情描写","token":"jiuwo"}'
```

Expected: 400 with the moderation message.

- [ ] **Step 7: Commit env example**

```bash
git add .env.local
git commit -m "chore(story-relay): add test tokens to env"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: All existing tests + new tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: PASS (or only pre-existing issues).

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat(story-relay): complete story relay feature ready for testing"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: 数据模型、接口、前端、AI prompt、内容尺度、测试计划均已对应到任务。
- [x] **Placeholder scan**: 无 TBD/TODO，所有步骤包含可执行代码或命令。
- [x] **Type consistency**: `StorySegment` 字段名、API 返回字段名、组件 props 名保持一致。
- [x] **Dependencies**: 使用 `crypto.randomUUID()` 避免新增 `uuid` 依赖。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-story-relay.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
