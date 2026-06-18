import { searchMemoriesByKeyword } from "../lib/darkroom-memory";

async function main() {
  const seen = new Map<number, { content: string; type?: string; conf: number }>();
  for (const kw of ["Aidan", "老王", "老wang", "前任"]) {
    const rows = await searchMemoriesByKeyword(kw, 200);
    for (const m of rows) {
      if (seen.has(m.id)) continue;
      const content = m.content.toLowerCase();
      const hasAidan = /\b(aidan|艾丹)\b/i.test(m.content);
      const hasLaowang = /(老王|老wang|laowang)/i.test(m.content);
      if (hasAidan && hasLaowang) {
        seen.set(m.id, { content: m.content, type: m.memory_type ?? "user_fact", conf: m.confidence });
      }
    }
  }
  console.log(`Found ${seen.size} memories mentioning both Aidan and 老王:\n`);
  for (const [id, m] of seen) {
    console.log(`#${id} [${m.type}] conf=${m.conf}`);
    console.log(`  ${m.content}\n`);
  }
}

main().catch(console.error);
