import { searchMemoriesByKeyword } from "../lib/darkroom-memory";

async function main() {
  const aidan = await searchMemoriesByKeyword("Aidan", 200);
  const aidanZh = await searchMemoriesByKeyword("aidan", 200);
  const seen = new Set<number>();
  const merged = [];
  for (const m of [...aidan, ...aidanZh]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    merged.push(m);
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  console.log(JSON.stringify({ total: merged.length, memories: merged }, null, 2));
}

main().catch((err) => {
  console.error("Filter failed:", err);
  process.exit(1);
});
