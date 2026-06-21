import { neon } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const sinceDays = Number(process.argv.find((a) => a.startsWith('--since='))?.split('=')[1] || '30');
  const messagesPerSession = Number(process.argv.find((a) => a.startsWith('--messages='))?.split('=')[1] || '200');
  const outPath = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1]
    || path.resolve(process.cwd(), 'exports', `darkroom-session-history-${new Date().toISOString().slice(0, 10)}.html`);

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
    `,
    []
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

  const totalConvs = sessions.reduce((sum, s) => sum + Number(s.message_count), 0);

  const sessionDetails: Array<{
    session: typeof sessions[0];
    messages: Array<{ user_message: string; assistant_response: string; source_lang: string; created_at: string }>;
  }> = [];

  for (const s of sessions) {
    if (s.message_count === 0) {
      sessionDetails.push({ session: s, messages: [] });
      continue;
    }
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
    sessionDetails.push({ session: s, messages: convResult.rows as { user_message: string; assistant_response: string; source_lang: string; created_at: string }[] });
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Darkroom 会话历史</title>
<style>
:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --surface-2: #1c1c1c;
  --gold: #c9a227;
  --gold-dim: #a6882a;
  --text: #f5f5f0;
  --text-dim: #a0a098;
  --user: #6a8a8a;
  --ai: #c9a227;
  --border: rgba(201, 162, 39, 0.25);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.55;
  padding: 24px 16px 80px;
}
header {
  max-width: 860px;
  margin: 0 auto 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
h1 { margin: 0 0 8px; font-size: 1.5rem; color: var(--gold); letter-spacing: 0.04em; }
.stats { color: var(--text-dim); font-size: 0.9rem; }
.controls {
  max-width: 860px;
  margin: 0 auto 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
input[type="search"] {
  flex: 1 1 260px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.95rem;
}
input[type="search"]:focus { outline: 2px solid var(--gold); outline-offset: 2px; }
button {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--gold);
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
button:hover { background: var(--surface-2); }
.sessions {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.session {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.session-header {
  width: 100%;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.session-header:hover { background: rgba(201, 162, 39, 0.06); }
.session-title {
  font-weight: 600;
  color: var(--gold);
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}
.session-title .chevron {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 6px solid var(--gold);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  transition: transform 0.2s ease;
}
.session.collapsed .session-title .chevron { transform: rotate(-90deg); }
.session-meta {
  color: var(--text-dim);
  font-size: 0.82rem;
}
.identity {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 12px;
  background: rgba(201, 162, 39, 0.15);
  color: var(--gold);
  font-size: 0.78rem;
  font-weight: 500;
}
.messages {
  border-top: 1px solid var(--border);
  padding: 12px 16px 16px;
}
.message {
  margin-bottom: 16px;
}
.message:last-child { margin-bottom: 0; }
.msg-time {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.msg-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}
.user .msg-label { color: var(--user); }
.ai .msg-label { color: var(--ai); }
.msg-body {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.user .msg-body { border-left: 3px solid rgba(106, 138, 138, 0.5); }
.ai .msg-body { border-left: 3px solid rgba(201, 162, 39, 0.45); }
.empty { color: var(--text-dim); font-style: italic; }
.hidden { display: none; }
footer {
  max-width: 860px;
  margin: 32px auto 0;
  color: var(--text-dim);
  font-size: 0.8rem;
  text-align: center;
}
</style>
</head>
<body>
<header>
  <h1>Darkroom 会话历史</h1>
  <div class="stats">
    生成时间：${formatTime(new Date().toISOString())} · 最近 ${sinceDays} 天 · ${sessions.length} 个 session · ${totalConvs} 条对话
  </div>
</header>
<div class="controls">
  <input type="search" id="search" placeholder="搜索 session ID、身份或消息内容…" />
  <button id="expandAll">全部展开</button>
  <button id="collapseAll">全部折叠</button>
</div>
<div class="sessions" id="sessions">
${sessionDetails.map(({ session, messages }) => {
  const title = session.user_identity
    ? `Session · ${escapeHtml(session.session_id.slice(0, 8))}… <span class="identity">${escapeHtml(session.user_identity)}</span>`
    : `Session · ${escapeHtml(session.session_id.slice(0, 8))}…`;
  const meta = `${session.message_count} 条 · 首次 ${formatTime(session.first_message_at)} · 最近 ${formatTime(session.last_message_at)}`;
  const messagesHtml = messages.length === 0
    ? '<p class="empty">该 session 暂无对话记录。</p>'
    : messages.map((m) => `
  <div class="message user">
    <div class="msg-time">${formatTime(m.created_at)} · ${escapeHtml(m.source_lang)}</div>
    <div class="msg-label">用户</div>
    <div class="msg-body">${escapeHtml(m.user_message)}</div>
  </div>
  <div class="message ai">
    <div class="msg-label">AI</div>
    <div class="msg-body">${escapeHtml(m.assistant_response)}</div>
  </div>
`).join('');
  return `
  <section class="session" data-keywords="${escapeHtml((session.session_id + ' ' + (session.user_identity || '') + ' ' + messages.map(m => m.user_message + ' ' + m.assistant_response).join(' ')).toLowerCase())}">
    <button class="session-header" aria-expanded="true">
      <span class="session-title"><span class="chevron"></span>${title}</span>
      <span class="session-meta">${meta}</span>
    </button>
    <div class="messages">
      ${messagesHtml}
    </div>
  </section>
`;
}).join('')}
</div>
<footer>本地数据导出 · 仅供内部查看</footer>
<script>
const sessions = document.querySelectorAll('.session');
const searchInput = document.getElementById('search');

document.getElementById('expandAll').addEventListener('click', () => {
  sessions.forEach(s => { s.classList.remove('collapsed'); updateAria(s); });
});
document.getElementById('collapseAll').addEventListener('click', () => {
  sessions.forEach(s => { s.classList.add('collapsed'); updateAria(s); });
});

sessions.forEach(s => {
  const header = s.querySelector('.session-header');
  header.addEventListener('click', () => {
    s.classList.toggle('collapsed');
    updateAria(s);
  });
});

function updateAria(session) {
  const header = session.querySelector('.session-header');
  header.setAttribute('aria-expanded', !session.classList.contains('collapsed'));
}

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  sessions.forEach(s => {
    const keywords = s.dataset.keywords;
    const match = !q || keywords.includes(q);
    s.classList.toggle('hidden', !match);
    if (match && q) s.classList.remove('collapsed');
  });
});
</script>
</body>
</html>`;

  await fs.writeFile(outPath, html, 'utf-8');
  console.log(`已导出：${outPath}`);
  console.log(`会话数：${sessions.length}，对话数：${totalConvs}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
