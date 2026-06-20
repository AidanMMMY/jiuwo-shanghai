import { neon } from '@neondatabase/serverless';
import {
  extractExplicitName,
  extractUserNameFromHistory,
  shouldAskIdentity,
  isIdentityRefusal,
  countFirstPersonReferences,
} from '../lib/darkroom-chat';
import type { HistoryMessage } from '../lib/darkroom-chat';

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

  const sessionsRes = await sql`
    SELECT session_id, user_identity, identity_probe_count, identity_probe_declined
    FROM darkroom_sessions
    ORDER BY updated_at DESC
  `;
  const sessions = sessionsRes.rows as Array<{session_id:string; user_identity:string|null; identity_probe_count:number; identity_probe_declined:boolean}>;

  for (const s of sessions) {
    const convs = await sql`
      SELECT user_message, assistant_response, source_lang, created_at
      FROM darkroom_conversations
      WHERE session_id = ${s.session_id}
      ORDER BY created_at ASC
    `;
    const rows = convs.rows as Array<{user_message:string; assistant_response:string; source_lang:string; created_at:string}>;

    const history: HistoryMessage[] = [];
    let simulatedProbeCount = 0;
    let simulatedDeclined = false;
    let lastProbeTurn = 0;
    let firstAskTurn: number | null = null;
    let blockedByName: string | null = null;
    let selfRefCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isZh = r.source_lang === 'zh';

      history.push({ role: 'user', content: r.user_message });

      const explicit = extractExplicitName(r.user_message, isZh);
      const fromHistory = extractUserNameFromHistory(history, isZh);
      const inferredName = explicit || fromHistory;

      selfRefCount += countFirstPersonReferences(r.user_message, isZh);

      if (inferredName) {
        blockedByName = inferredName;
        // Once a name is "known", probing would stop in the real system.
        // Add assistant response and continue.
        history.push({ role: 'assistant', content: r.assistant_response });
        continue;
      }

      const wouldAsk = shouldAskIdentity(
        history,
        isZh,
        '',
        simulatedProbeCount,
        simulatedDeclined,
        lastProbeTurn
      );

      if (wouldAsk) {
        if (firstAskTurn === null) firstAskTurn = i + 1;
        simulatedProbeCount++;
        lastProbeTurn = history.filter((m) => m.role === 'user').length;
        // Check if the assistant response looks like it asked (contains name words)
        const assistantAsks = /该怎么称呼|名字|叫什么|what should i call|your name/i.test(r.assistant_response);
        if (!assistantAsks) {
          // Model ignored the instruction
        }
      }

      if (isIdentityRefusal(r.user_message, isZh)) {
        simulatedDeclined = true;
      }

      history.push({ role: 'assistant', content: r.assistant_response });
    }

    const summary = [
      `session: ${s.session_id.slice(0, 8)}…`,
      `db probe_count=${s.identity_probe_count} declined=${s.identity_probe_declined}`,
      `simulated asks=${simulatedProbeCount} firstAtTurn=${firstAskTurn ?? 'never'}`,
      `self_ref_total=${selfRefCount}`,
      blockedByName ? `blocked_by_extracted_name="${blockedByName}"` : 'name_blocked=false',
    ].join(' | ');

    // Only print sessions where something interesting happened
    if (simulatedProbeCount > 0 || blockedByName || s.identity_probe_count > 0) {
      console.log('\n' + summary);
      if (blockedByName) {
        // Find the turn that caused the block
        const h2: HistoryMessage[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          h2.push({ role: 'user', content: r.user_message });
          const isZh = r.source_lang === 'zh';
          const n = extractUserNameFromHistory(h2, isZh);
          if (n === blockedByName) {
            console.log(`  name extracted at turn ${i + 1}: ${r.user_message.slice(0, 60)}`);
            break;
          }
          h2.push({ role: 'assistant', content: r.assistant_response });
        }
      }
      if (firstAskTurn !== null) {
        const r = rows[firstAskTurn - 1];
        console.log(`  first ask would fire after user: ${r.user_message.slice(0, 60)}`);
        console.log(`  assistant actually replied: ${r.assistant_response.slice(0, 80)}`);
      }
    }
  }

  // Summary counts
  const totalSessions = sessions.length;
  const sessionsWithSelfRefs = await sql`
    SELECT session_id FROM darkroom_conversations
    WHERE source_lang = 'zh' AND user_message LIKE '%我%'
    GROUP BY session_id
  `;
  console.log(`\n=== 总结 ===`);
  console.log(`总会话：${totalSessions}`);
  console.log(`含“我”的会话：${sessionsWithSelfRefs.rows.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
