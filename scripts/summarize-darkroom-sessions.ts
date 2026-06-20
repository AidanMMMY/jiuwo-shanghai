import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

async function main() {
  const sql = getSql();
  const sinceDays = Number(process.argv.find((a) => a.startsWith('--since='))?.split('=')[1] || '30');

  const totalSessions = await sql.query(
    `SELECT COUNT(*) AS count FROM darkroom_sessions WHERE created_at > NOW() - INTERVAL '${sinceDays} days'`
  );
  const totalConvs = await sql.query(
    `SELECT COUNT(*) AS count FROM darkroom_conversations WHERE created_at > NOW() - INTERVAL '${sinceDays} days'`
  );
  const identified = await sql.query(
    `SELECT COUNT(*) AS count FROM darkroom_sessions WHERE user_identity IS NOT NULL AND created_at > NOW() - INTERVAL '${sinceDays} days'`
  );
  const topIdentities = await sql.query(
    `SELECT user_identity, COUNT(*) AS count
     FROM darkroom_sessions
     WHERE user_identity IS NOT NULL AND created_at > NOW() - INTERVAL '${sinceDays} days'
     GROUP BY user_identity
     ORDER BY count DESC
     LIMIT 10`
  );
  const byLang = await sql.query(
    `SELECT source_lang, COUNT(*) AS count FROM darkroom_conversations WHERE created_at > NOW() - INTERVAL '${sinceDays} days' GROUP BY source_lang ORDER BY count DESC`
  );

  console.log(`最近 ${sinceDays} 天统计`);
  console.log(`会话总数：${(totalSessions.rows[0] as {count:number}).count}`);
  console.log(`对话条数：${(totalConvs.rows[0] as {count:number}).count}`);
  console.log(`已识别身份会话：${(identified.rows[0] as {count:number}).count}`);
  console.log('\n语言分布：');
  for (const row of byLang.rows as {source_lang:string;count:number}[]) {
    console.log(`  ${row.source_lang}: ${row.count}`);
  }
  console.log('\n常见身份（已识别）：');
  for (const row of topIdentities.rows as {user_identity:string;count:number}[]) {
    console.log(`  ${row.user_identity}: ${row.count} 个会话`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
