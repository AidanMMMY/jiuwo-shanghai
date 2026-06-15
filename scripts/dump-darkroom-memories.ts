import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversations,
} from "../lib/darkroom-memory";

async function main() {
  const memStats = await getMemoryStats();
  const memories = await getRecentMemories(50);
  const convStats = await getConversationStats();
  const conversations = await getRecentConversations(50);

  const payload = {
    summary: {
      memories: memStats,
      conversations: convStats,
    },
    memories,
    conversations,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error("Dump failed:", err);
  process.exit(1);
});
