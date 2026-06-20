import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  return neon(url, { fullResults: true });
}

function truncate(text: string, max = 160) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

async function main() {
  const sql = getSql();

  const sessionLimit = Number(process.argv.find((a) => a.startsWith('--sessions='))?.split('=')[1] || '20');
  const messagesPerSession = Number(process.argv.find((a) => a.startsWith('--messages='))?.split('=')[1] || '30');
  const sinceDays = Number(process.argv.find((a) => a.startsWith('--since='))?.split('=')[1] || '30');

  const sinceClause = sinceDays > 0
    ? `AND c.created_at > NOW() - INTERVAL '${sinceDays} days'`
    : '';

  const sessionResult = await sql.query(
    `
    SELECT
      s.session_id,
      s.user_identity,
      s.created_at AS session_created_at,
      s.updated_at AS session_updated_at,
      COUNT(c.id) AS message_count,
      MIN(c.created_at) AS first_message_at,
      MAX(c.created_at) AS last_message_at
    FROM darkroom_sessions s
    LEFT JOIN darkroom_conversations c ON c.session_id = s.session_id
    WHERE 1=1 ${sinceClause}
    GROUP BY s.session_id, s.user_identity, s.created_at, s.updated_at
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT $1
    `,
    [sessionLimit]
  );

  const sessions = sessionResult.rows as Array<{
    session_id: string;
    user_identity: string | null;
    session_created_at: string;
    session_updated_at: string;
    message_count: number;
    first_message_at: string;
    last_message_at: string;
  }>;

  if (sessions.length === 0) {
    console.log('暂无会话记录。');
    return;
  }

  for (const s of sessions) {
    console.log(`\n--- 会话 ${s.session_id}${s.user_identity ? ` | 身份：${s.user_identity}` : ''} ---`);
    console.log(`  消息数：${s.message_count} | 首次：${new Date(s.first_message_at).toLocaleString('zh-CN')} | 最近：${new Date(s.last_message_at).toLocaleString('zh-CN')}`);

    if (s.message_count === 0) continue;

    const convResult = await sql.query(
      `
      SELECT user_message, assistant_response, source_lang, created_at
      FROM darkroom_conversations
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [s.session_id, messagesPerSession]
    );

    const convs = convResult.rows as Array<{
      user_message: string;
      assistant_response: string;
      source_lang: string;
      created_at: string;
    }>;

    if (s.message_count > messagesPerSession) {
      console.log(`  （仅展示最近 ${messagesPerSession} 条，共 ${s.message_count} 条）`);
    }

    for (const c of convs) {
      const time = new Date(c.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      console.log(`  [${time}] 用户：${truncate(c.user_message)}`);
      console.log(`            AI：${truncate(c.assistant_response)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
