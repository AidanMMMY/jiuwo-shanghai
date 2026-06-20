import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function main() {
  const sql = getSql();

  const totalResult = await sql`SELECT COUNT(*) AS count FROM darkroom_sessions`;
  const total = Number((totalResult.rows[0] as { count: number }).count);

  const probeDist = await sql`
    SELECT identity_probe_count, identity_probe_declined, COUNT(*) AS count
    FROM darkroom_sessions
    GROUP BY identity_probe_count, identity_probe_declined
    ORDER BY identity_probe_count, identity_probe_declined
  `;

  const identified = await sql`
    SELECT COUNT(*) AS count FROM darkroom_sessions WHERE user_identity IS NOT NULL
  `;

  const askedNoIdentity = await sql`
    SELECT session_id, user_identity, identity_probe_count, identity_probe_declined, created_at, updated_at
    FROM darkroom_sessions
    WHERE identity_probe_count > 0 AND user_identity IS NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `;

  console.log(`=== 会话总数：${total} ===\n`);
  console.log('已识别身份会话数：', Number((identified.rows[0] as {count:number}).count), '\n');

  console.log('=== identity_probe 分布 ===');
  for (const row of probeDist.rows as Array<{identity_probe_count:number; identity_probe_declined:boolean; count:number}>) {
    const declined = row.identity_probe_declined ? '已拒绝' : '未拒绝';
    console.log(`  已询问 ${row.identity_probe_count} 次 · ${declined}: ${row.count}`);
  }

  console.log('\n=== 最近 20 个“问过但没给出名字”的 session ===');
  for (const s of askedNoIdentity.rows as Array<{session_id:string; user_identity:string|null; identity_probe_count:number; identity_probe_declined:boolean; created_at:string; updated_at:string}>) {
    console.log(`\n  ${s.session_id} | 问过 ${s.identity_probe_count} 次 | 拒绝=${s.identity_probe_declined} | 最近 ${formatTime(s.updated_at)}`);
    const convs = await sql`
      SELECT user_message, assistant_response, created_at
      FROM darkroom_conversations
      WHERE session_id = ${s.session_id}
      ORDER BY created_at ASC
      LIMIT 6
    `;
    for (const c of convs.rows as Array<{user_message:string; assistant_response:string; created_at:string}>) {
      console.log(`    [${formatTime(c.created_at)}] 用户：${c.user_message.slice(0, 80)}`);
      console.log(`                  AI：${c.assistant_response.slice(0, 80)}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
