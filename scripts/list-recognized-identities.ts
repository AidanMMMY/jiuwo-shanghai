import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

async function main() {
  const sql = getSql();

  const sessionIdentities = await sql`
    SELECT user_identity, COUNT(*) AS count, MAX(updated_at) AS latest
    FROM darkroom_sessions
    WHERE user_identity IS NOT NULL
    GROUP BY user_identity
    ORDER BY count DESC, latest DESC
  `;

  const memoryIdentities = await sql`
    SELECT source_identity, COUNT(*) AS count, MAX(created_at) AS latest
    FROM darkroom_memories
    WHERE source_identity IS NOT NULL
    GROUP BY source_identity
    ORDER BY count DESC, latest DESC
  `;

  const suspiciousMemoryIds = await sql`
    SELECT id, content, source_identity, memory_type, created_at
    FROM darkroom_memories
    WHERE source_identity IS NOT NULL
      AND (
        source_identity ~* '^(ISTJ|ISFJ|INFJ|INTJ|ISTP|ISFP|INFP|INTP|ESTP|ESFP|ENFP|ENTP|ESTJ|ESFJ|ENFJ|ENTJ)$'
        OR LENGTH(source_identity) > 12
        OR source_identity ~ '^[不的了吗呢吧啊哦嗯谁出来上下过]'
      )
    ORDER BY created_at DESC
    LIMIT 50
  `;

  console.log('=== 当前 session 中识别的身份 ===');
  if (sessionIdentities.rows.length === 0) {
    console.log('无');
  } else {
    for (const row of sessionIdentities.rows as Array<{user_identity:string;count:number;latest:string}>) {
      console.log(`  ${row.user_identity}: ${row.count} 个 session，最近 ${new Date(row.latest).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'})}`);
    }
  }

  console.log('\n=== 当前 memories 中 source_identity 分布 ===');
  if (memoryIdentities.rows.length === 0) {
    console.log('无');
  } else {
    for (const row of memoryIdentities.rows as Array<{source_identity:string;count:number;latest:string}>) {
      console.log(`  ${row.source_identity}: ${row.count} 条记忆，最近 ${new Date(row.latest).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'})}`);
    }
  }

  console.log('\n=== 可疑 source_identity 记录（MBTI、过长、含虚词）===');
  if (suspiciousMemoryIds.rows.length === 0) {
    console.log('无');
  } else {
    for (const row of suspiciousMemoryIds.rows as Array<{id:number;content:string;source_identity:string;memory_type:string;created_at:string}>) {
      console.log(`  id=${row.id} | ${row.source_identity} | ${row.memory_type} | ${new Date(row.created_at).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'})}`);
      console.log(`    ${row.content.slice(0, 120)}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
