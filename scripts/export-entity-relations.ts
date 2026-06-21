// Export full entity relation graph to docs/ in markdown + HTML.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/export-entity-relations.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

interface RelationRow {
  entity_a: string;
  entity_b: string;
  relation_type: string;
  is_current: boolean;
  confidence: number;
  evidence_memory_id: number | null;
  created_at: string;
}

function formatDate(shanghaiDate: string): string {
  if (!shanghaiDate) return '-';
  const d = new Date(shanghaiDate);
  if (isNaN(d.getTime())) return shanghaiDate;
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function relationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    friend: '朋友',
    partner: '伴侣',
    lover: '恋人',
    fwb: '炮友',
    date: '约会',
    affair: '婚外情',
    colleague: '同事',
    ex: '前任',
    sibling: '兄弟姐妹',
    crush: '暗恋/好感',
    knows: '认识',
    mentioned_with: '一起提及',
  };
  return labels[type] || type;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const docsDir = path.resolve('docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const relationsResult = await sql`
    SELECT
      a.name AS entity_a,
      b.name AS entity_b,
      r.relation_type,
      r.is_current,
      r.confidence,
      r.evidence_memory_id,
      r.created_at
    FROM darkroom_entity_relations r
    JOIN darkroom_entities a ON a.id = r.entity_a_id
    JOIN darkroom_entities b ON b.id = r.entity_b_id
    ORDER BY
      CASE WHEN r.is_current THEN 0 ELSE 1 END,
      r.relation_type,
      a.name,
      b.name
  `;
  const rows = relationsResult.rows as RelationRow[];

  const statsResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_current = TRUE) AS current_count,
      COUNT(*) FILTER (WHERE is_current = FALSE) AS past_count,
      COUNT(DISTINCT entity_a_id) AS entity_a_count,
      COUNT(DISTINCT entity_b_id) AS entity_b_count
    FROM darkroom_entity_relations
  `;
  const stats = statsResult.rows[0] as {
    current_count: number;
    past_count: number;
    entity_a_count: number;
    entity_b_count: number;
  };

  const entityResult = await sql`SELECT COUNT(*) AS c FROM darkroom_entities`;
  const totalEntities = (entityResult.rows[0] as { c: number }).c;

  // Build per-entity adjacency summary
  const entityMap = new Map<string, { current: string[]; past: string[] }>();
  for (const r of rows) {
    for (const name of [r.entity_a, r.entity_b]) {
      if (!entityMap.has(name)) entityMap.set(name, { current: [], past: [] });
    }
    const label = `${relationTypeLabel(r.relation_type)}(${r.is_current ? '当前' : '过去'})`;
    if (r.is_current) {
      entityMap.get(r.entity_a)!.current.push(`${label}: ${r.entity_b}`);
      entityMap.get(r.entity_b)!.current.push(`${label}: ${r.entity_a}`);
    } else {
      entityMap.get(r.entity_a)!.past.push(`${label}: ${r.entity_b}`);
      entityMap.get(r.entity_b)!.past.push(`${label}: ${r.entity_a}`);
    }
  }

  const mdPath = path.join(docsDir, `${today}-darkroom-entity-relations.md`);
  const htmlPath = path.join(docsDir, `${today}-darkroom-entity-relations.html`);

  // ---- Markdown ----
  const mdLines: string[] = [
    '# Darkroom 全量人物关系图谱',
    '',
    `**生成日期**：${new Date().toISOString().slice(0, 10)}`,
    `**数据来源**：\`darkroom_entity_relations\` 表`,
    `**统计**：共 ${rows.length} 条关系（当前 ${stats.current_count} / 过去 ${stats.past_count}），涉及 ${totalEntities} 个实体`,
    '',
    '---',
    '',
    '## 关系总览表',
    '',
    '| 实体 A | 关系 | 实体 B | 时态 | 置信度 | 证据记忆 ID | 创建时间 |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const r of rows) {
    mdLines.push(
      `| ${r.entity_a} | ${relationTypeLabel(r.relation_type)} | ${r.entity_b} | ${r.is_current ? '当前' : '过去'} | ${r.confidence} | ${r.evidence_memory_id ?? '-'} | ${formatDate(r.created_at)} |`
    );
  }

  mdLines.push(
    '',
    '---',
    '',
    '## 按人物分组的关系',
    ''
  );

  const sortedNames = Array.from(entityMap.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  for (const name of sortedNames) {
    const { current, past } = entityMap.get(name)!;
    mdLines.push(`### ${name}`, '');
    if (current.length) {
      mdLines.push('**当前关系**：', ...current.map(x => `- ${x}`), '');
    }
    if (past.length) {
      mdLines.push('**过去关系**：', ...past.map(x => `- ${x}`), '');
    }
    if (!current.length && !past.length) {
      mdLines.push('- 无关系记录', '');
    }
  }

  mdLines.push(
    '',
    '---',
    '',
    '*本文件由 Claude 在自动生成，用于人工审阅 Darkroom 人物关系网络。*'
  );

  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
  console.log('Wrote', mdPath);

  // ---- HTML ----
  const htmlRows = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.entity_a)}</td>
      <td>${escapeHtml(relationTypeLabel(r.relation_type))}</td>
      <td>${escapeHtml(r.entity_b)}</td>
      <td class="${r.is_current ? 'current' : 'past'}">${r.is_current ? '当前' : '过去'}</td>
      <td>${r.confidence}</td>
      <td>${r.evidence_memory_id ?? '-'}</td>
      <td>${formatDate(r.created_at)}</td>
    </tr>
  `).join('');

  const groupHtml = sortedNames.map(name => {
    const { current, past } = entityMap.get(name)!;
    const currentItems = current.length
      ? `<ul>${current.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<p class="muted">无当前关系</p>';
    const pastItems = past.length
      ? `<ul>${past.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<p class="muted">无过去关系</p>';
    return `
      <div class="card">
        <h3>${escapeHtml(name)}</h3>
        <div class="group">
          <div><h4>当前关系</h4>${currentItems}</div>
          <div><h4>过去关系</h4>${pastItems}</div>
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Darkroom 全量人物关系图谱</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --fg: #f5f5f0;
      --muted: #888;
      --accent: #c9a227;
      --border: #333;
      --current: #4caf50;
      --past: #ff9800;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--fg);
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 24px;
      line-height: 1.7;
    }
    h1 { color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 12px; }
    h2 { color: var(--accent); margin-top: 48px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    h3 { color: var(--fg); margin-top: 0; }
    h4 { color: var(--muted); margin: 0 0 8px; font-size: 14px; text-transform: uppercase; }
    p.meta { color: var(--muted); font-size: 14px; }
    code {
      background: #1a1a1a;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", Monaco, monospace;
      font-size: 0.9em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
    }
    th { background: #1a1a1a; color: var(--accent); }
    tr:nth-child(even) { background: #111; }
    .current { color: var(--current); font-weight: 600; }
    .past { color: var(--past); font-weight: 600; }
    .muted { color: var(--muted); }
    .card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      background: #111;
    }
    .group { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .group { grid-template-columns: 1fr; } }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
  </style>
</head>
<body>

<h1>Darkroom 全量人物关系图谱</h1>
<p class="meta">
  <strong>生成日期</strong>：${new Date().toISOString().slice(0, 10)}<br>
  <strong>数据来源</strong>：<code>darkroom_entity_relations</code> 表<br>
  <strong>统计</strong>：共 ${rows.length} 条关系（当前 ${stats.current_count} / 过去 ${stats.past_count}），涉及 ${totalEntities} 个实体
</p>

<h2>关系总览表</h2>
<table>
  <thead>
    <tr>
      <th>实体 A</th>
      <th>关系</th>
      <th>实体 B</th>
      <th>时态</th>
      <th>置信度</th>
      <th>证据记忆 ID</th>
      <th>创建时间</th>
    </tr>
  </thead>
  <tbody>
    ${htmlRows}
  </tbody>
</table>

<h2>按人物分组的关系</h2>
${groupHtml}

<p class="meta">本文件由 Claude 在自动生成，用于人工审阅 Darkroom 人物关系网络。</p>

</body>
</html>
`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('Wrote', htmlPath);
}

main().catch(console.error);
