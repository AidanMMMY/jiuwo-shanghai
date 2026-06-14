import { NextRequest } from 'next/server';
import { deepseekClient, DEFAULT_MODEL } from '@/lib/deepseek/client';
import { searchTavily, type TavilyResult } from '@/lib/tavily/client';
import { neon } from '@neondatabase/serverless';

const LOCAL_TOPICS_EN = [
  'drink', 'cocktail', 'wine', 'tea', 'whiskey', 'menu', 'bar', 'jiuwo',
  'location', 'address', 'hours', 'open', 'close', 'time',
  'aidan', 'entity', 'regular', 'friend',
  'julu road', 'french concession', 'neighborhood',
  'event', 'album', 'gallery', 'special',
];

const LOCAL_TOPICS_ZH = [
  '酒', '鸡尾酒', '葡萄酒', '茶', '威士忌', '菜单', '酒吧', '啾喔', 'jiuwo',
  '地址', '位置', '在哪', '营业时间', '几点', '开门', '关门', '时间',
  'aidan', '实体', '常客', '朋友',
  '巨鹿路', '法租界', '街区',
  '活动', '相册', '画廊', '特别',
];

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT || 'default-salt';
  const data = new TextEncoder().encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

export async function ensureSearchLogsTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS darkroom_search_logs (
      id           SERIAL PRIMARY KEY,
      ip_hash      TEXT NOT NULL,
      query        TEXT NOT NULL,
      results_count INT NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_search_logs_ip_created ON darkroom_search_logs(ip_hash, created_at DESC)`;
}

export async function logSearch(ipHash: string, query: string, resultsCount: number): Promise<void> {
  await ensureSearchLogsTable();
  const sql = getSql();
  await sql`
    INSERT INTO darkroom_search_logs (ip_hash, query, results_count)
    VALUES (${ipHash}, ${query}, ${resultsCount})
  `;
}

export async function recentSearchCountForIp(ipHash: string, minutes: number = 60): Promise<number> {
  await ensureSearchLogsTable();
  const sql = getSql();
  const result = await sql`
    SELECT COUNT(*) as count
    FROM darkroom_search_logs
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - INTERVAL '1 minute' * ${minutes}
  `;
  return Number((result.rows[0] as { count: number }).count);
}

function looksLocal(query: string, isZh?: boolean): boolean {
  const lower = query.toLowerCase();
  const topics = isZh ? LOCAL_TOPICS_ZH : LOCAL_TOPICS_EN;
  return topics.some((topic) => lower.includes(topic.toLowerCase()));
}

export async function shouldSearch(message: string, isZh?: boolean): Promise<boolean> {
  // Fast path: if the query clearly touches local topics, skip search.
  if (looksLocal(message, isZh)) {
    return false;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'dummy-key-for-build') {
    // No routing LLM available; default to no search to avoid costs.
    return false;
  }

  const system = isZh
    ? '你是一个路由子程序。判断用户问题是否能从 JIUWO 酒吧本地知识库回答（酒水、茶、位置、营业时间、常客、街区、活动）。只能回复“search”或“local”两个词之一，不要解释。'
    : 'You are a routing subroutine. Decide if the user query can be answered from the local JIUWO bar knowledge base (drinks, tea, location, hours, regulars, neighborhood, events). Reply with ONLY the word "search" or "local", no explanation.';

  const user = isZh
    ? `用户问题：${message}\n判断：`
    : `User query: ${message}\nDecision:`;

  try {
    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 10,
    });
    const decision = completion.choices[0]?.message?.content?.trim().toLowerCase() || '';
    return decision.includes('search');
  } catch {
    // On routing failure, default to no search.
    return false;
  }
}

export interface SearchAndFormatOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
}

export async function searchAndFormat(
  query: string,
  isZh?: boolean,
  options: SearchAndFormatOptions = {}
): Promise<{ block: string; resultsCount: number } | null> {
  const { maxResults = 3, searchDepth = 'basic' } = options;

  try {
    const tavilyResponse = await searchTavily(query, { maxResults, searchDepth });
    const results = tavilyResponse.results || [];
    if (results.length === 0) {
      return null;
    }

    const header = isZh
      ? '=== 外部数据扇区 ===\n以下痕迹从开放网络检索而来。仅在相关时引用，并保持你一贯的日志式语气。'
      : '=== EXTERNAL DATA SECTOR ===\nThe following traces were retrieved from the open web. Reference them only if relevant, and stay in your usual log-style voice.';

    const footer = isZh ? '=== 结束 ===' : '=== END ===';

    const formatted = results
      .map((r: TavilyResult, i: number) => {
        const title = r.title || (isZh ? '未命名来源' : 'Untitled source');
        const content = (r.content || '').replace(/\s+/g, ' ').trim();
        return `${i + 1}. ${title}\n   ${content}`;
      })
      .join('\n\n');

    const block = `${header}\n\n${formatted}\n\n${footer}`;
    return { block, resultsCount: results.length };
  } catch {
    return null;
  }
}
