import { neon } from "@neondatabase/serverless";
import {
  searchMemoriesByKeyword,
  searchConversationsByKeyword,
  deleteMemoriesByIds,
  getDynamicEntities,
} from "../lib/darkroom-memory";

function getSql() {
  const url =
    process.env.POSTGRES_URL ||
    process.env.GUESTBOOK_POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!url) throw new Error("No Postgres URL configured");
  return neon(url, { fullResults: true });
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function mentionsAidanAndLaowang(text: string): boolean {
  const n = normalize(text);
  return /\b(aidan|艾丹)\b/i.test(text) && /(老王|老wang|laowang)/i.test(text);
}

const EX_RELATIONSHIP_TERMS = [
  /前任/,
  /\bex\b/,
  /前夫/,
  /前男[友朋]/,
  /情侣/,
  /在一起过/,
  /交往过/,
  /谈过/,
  /重组为[朋友老友]/,
  /有过一段[^\n]*(?:感情|历史|关系|恋情)/,
  /曾是情侣/,
  /曾是一对/,
];

const NEGATION_TERMS = [
  /纠正/,
  /更正/,
  /澄清/,
  /否认/,
  /修正/,
  /从来没/,
  /没有过/,
  /从未/,
  /不是前任/,
  /不是[^\n]*关系/,
  /只是[^\n]*好朋友/,
  /一直都是好朋友/,
  /只是[^\n]*朋友/,
  /从未在一起/,
  /没在一起过/,
  /没交往过/,
];

function segmentContainsExRelationship(segment: string): boolean {
  if (NEGATION_TERMS.some((re) => re.test(segment))) return false;
  if (!mentionsAidanAndLaowang(segment)) return false;
  return EX_RELATIONSHIP_TERMS.some((re) => re.test(segment));
}

function impliesExRelationship(content: string): boolean {
  // Split by common sentence/merge separators so cross-sentence gossip doesn't trigger.
  const segments = content.split(/[。！？\n;；\/]/);
  return segments.some((s) => segmentContainsExRelationship(s));
}

function isCorrectionOrDenial(content: string): boolean {
  return NEGATION_TERMS.some((re) => re.test(content));
}

async function main() {
  const candidateMemories: Awaited<ReturnType<typeof searchMemoriesByKeyword>> = [];
  const seenMemoryIds = new Set<number>();

  const searchKeywords = [
    "Aidan",
    "老王",
    "老wang",
    "前任",
    "ex",
    "感情",
    "历史",
    "关系",
    "重组",
  ];

  for (const kw of searchKeywords) {
    const rows = await searchMemoriesByKeyword(kw, 300);
    for (const m of rows) {
      if (seenMemoryIds.has(m.id)) continue;
      seenMemoryIds.add(m.id);
      if (!mentionsAidanAndLaowang(m.content)) continue;
      if (!impliesExRelationship(m.content)) continue;
      if (isCorrectionOrDenial(m.content)) continue;
      candidateMemories.push(m);
    }
  }

  // Manual overrides for edge cases the sentence heuristic still misclassifies.
  const FALSE_POSITIVE_IDS = new Set([456, 148]);
  const finalCandidates = candidateMemories.filter((m) => !FALSE_POSITIVE_IDS.has(m.id));

  console.log(`\n=== False / problematic memories (Aidan + 老王 as ex) (${finalCandidates.length}) ===\n`);
  for (const m of finalCandidates) {
    console.log(`#${m.id} [${m.source_lang}] conf=${m.confidence} type=${m.memory_type ?? "user_fact"}`);
    console.log(`  ${m.content}`);
    console.log(`  keywords: ${(m.keywords ?? []).join(", ")}`);
    console.log(`  created: ${m.created_at}\n`);
  }

  // Find source conversations.
  const convHits: Awaited<ReturnType<typeof searchConversationsByKeyword>> = [];
  const seenConvIds = new Set<number>();
  for (const kw of [
    "Aidan和老王是前任",
    "前任重组为老友",
    "Aidan和老王",
    "老王和aidan没有过一段",
    "Aidan和老王从来没交往过",
    "纠正",
  ]) {
    const rows = await searchConversationsByKeyword(kw, 100);
    for (const c of rows) {
      if (seenConvIds.has(c.id)) continue;
      seenConvIds.add(c.id);
      if (mentionsAidanAndLaowang(c.user_message) || mentionsAidanAndLaowang(c.assistant_response)) {
        convHits.push(c);
      }
    }
  }
  convHits.sort((a, b) => a.id - b.id);

  console.log(`\n=== Source / related conversations (${convHits.length}) ===\n`);
  for (const c of convHits.slice(0, 50)) {
    console.log(`conv #${c.id} [${c.source_lang}] session=${c.session_id ?? "n/a"} ${c.created_at}`);
    console.log(`  user: ${c.user_message}`);
    console.log(`  assistant: ${c.assistant_response}\n`);
  }

  // Check session summaries.
  console.log("=== Session summaries mentioning Aidan + 老王 ===\n");
  try {
    const sql = getSql();
    const result = await sql`
      SELECT session_id, summary, primary_entity
      FROM darkroom_sessions
      WHERE summary ILIKE ${'%Aidan%'} AND summary ILIKE ${'%老王%'}
    `;
    for (const row of result.rows as { session_id: string; summary: string; primary_entity?: string }[]) {
      console.log(`session ${row.session_id} (entity=${row.primary_entity ?? "n/a"})`);
      console.log(`  ${row.summary}\n`);
    }
  } catch (e) {
    console.log("Could not query sessions:", e);
  }

  // Dynamic entities.
  const entities = await getDynamicEntities();
  const relevantEntities = entities.filter(
    (e) =>
      /^(老王|Aidan)$/i.test(e.name) ||
      e.aliases.some((a) => /^(老王|Aidan)$/i.test(a))
  );
  if (relevantEntities.length) {
    console.log("=== Relevant dynamic entities ===\n");
    for (const e of relevantEntities) {
      console.log(`#${e.id} ${e.name} aliases=[${e.aliases.join(", ")}] source=${e.source}`);
    }
  }

  const dryRun = !process.argv.includes("--delete");
  if (dryRun) {
    console.log(`\nDry run: would delete memory IDs [${finalCandidates.map((m) => m.id).join(", ")}]`);
    console.log("Pass --delete to actually remove them.");
    return;
  }

  if (finalCandidates.length === 0) {
    console.log("\nNo candidate memories to delete.");
    return;
  }

  const deleted = await deleteMemoriesByIds(finalCandidates.map((m) => m.id));
  console.log(`\nDeleted ${deleted} memories: ${finalCandidates.map((m) => `#${m.id}`).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
