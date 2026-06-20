import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversations,
} from "@/lib/darkroom-memory";
import LoginForm from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const adminToken = process.env.DARKROOM_ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return <LoginForm />;
  }

  const [memoryStats, recentMemories, conversationStats, recentConversations] =
    await Promise.all([
      getMemoryStats(),
      getRecentMemories(20),
      getConversationStats(),
      getRecentConversations(20),
    ]);

  const typeColors: Record<string, string> = {
    user_fact: "bg-[#c9a227]",
    system_inferred: "bg-[#c9a22766]",
    correction: "bg-[#f5f5f0]",
  };

  const maxTypeCount = Math.max(...memoryStats.byType.map((t) => Number(t.count)), 1);

  return (
    <main className="bg-[#0a0a0a] min-h-[100lvh] px-4 md:px-12 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl md:text-3xl text-[#f5f5f0]">Darkroom Admin</h1>
          <p className="text-xs text-[#a0a0a0]">
            {new Date().toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}
          </p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Memories" value={memoryStats.total} />
          <StatCard label="Corrections" value={memoryStats.byType.find((t) => t.memory_type === "correction")?.count ?? 0} />
          <StatCard label="Unprocessed Conv." value={conversationStats.unprocessed} />
          <StatCard label="Total Retrievals" value={memoryStats.retrieval.totalRetrievals} />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Memory type distribution */}
          <section className="border border-[#c9a22733] p-5">
            <h2 className="text-sm uppercase tracking-wider text-[#c9a227] mb-5">
              Memory Types
            </h2>
            <div className="space-y-4">
              {memoryStats.byType.map((t) => (
                <div key={t.memory_type}>
                  <div className="flex justify-between text-sm text-[#f5f5f0] mb-1">
                    <span>{formatType(t.memory_type)}</span>
                    <span>{Number(t.count).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a]">
                    <div
                      className={`h-full ${typeColors[t.memory_type] ?? "bg-[#c9a227]"}`}
                      style={{ width: `${(Number(t.count) / maxTypeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Retrieval stats */}
          <section className="border border-[#c9a22733] p-5">
            <h2 className="text-sm uppercase tracking-wider text-[#c9a227] mb-5">
              Retrieval Health
            </h2>
            <div className="space-y-4">
              <StatRow
                label="Total retrievals"
                value={memoryStats.retrieval.totalRetrievals}
              />
              <StatRow
                label="Never retrieved"
                value={memoryStats.retrieval.neverRetrieved}
              />
              <StatRow
                label="Avg retrievals / memory"
                value={memoryStats.retrieval.avgRetrievalCount}
              />
              <StatRow
                label="Retrieval rate"
                value={`${
                  memoryStats.total > 0
                    ? (
                        ((memoryStats.total - memoryStats.retrieval.neverRetrieved) /
                          memoryStats.total) *
                        100
                      ).toFixed(1)
                    : 0
                }%`}
              />
            </div>
          </section>
        </div>

        {/* Recent memories */}
        <section className="border border-[#c9a22733] p-5 mb-8">
          <h2 className="text-sm uppercase tracking-wider text-[#c9a227] mb-5">
            Recent Memories
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#a0a0a0] border-b border-[#333]">
                <tr>
                  <th className="pb-3 font-normal">ID</th>
                  <th className="pb-3 font-normal">Type</th>
                  <th className="pb-3 font-normal">Content</th>
                  <th className="pb-3 font-normal">Conf.</th>
                  <th className="pb-3 font-normal">Hits</th>
                  <th className="pb-3 font-normal">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {recentMemories.map((m) => (
                  <tr key={m.id} className="text-[#f5f5f0]">
                    <td className="py-3 text-[#a0a0a0]">#{m.id}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 border border-[#c9a22733] text-[#c9a227]">
                        {formatType(m.memory_type ?? "user_fact")}
                      </span>
                    </td>
                    <td className="py-3 max-w-md truncate">{m.content}</td>
                    <td className="py-3 text-[#a0a0a0]">{m.confidence}</td>
                    <td className="py-3 text-[#a0a0a0]">{m.retrieval_count ?? 0}</td>
                    <td className="py-3 text-[#a0a0a0] whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString("zh-CN", {
                        timeZone: "Asia/Shanghai",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent conversations */}
        <section className="border border-[#c9a22733] p-5">
          <h2 className="text-sm uppercase tracking-wider text-[#c9a227] mb-5">
            Recent Conversations
          </h2>
          <div className="space-y-4">
            {recentConversations.map((c) => (
              <div key={c.id} className="border-b border-[#222] last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-[#a0a0a0]">#{c.id}</span>
                  <span className="text-xs px-2 py-0.5 border border-[#c9a22733] text-[#c9a227]">
                    {c.source_lang}
                  </span>
                  {!c.processed_for_memory && (
                    <span className="text-xs px-2 py-0.5 bg-[#c9a227] text-[#0a0a0a]">
                      unprocessed
                    </span>
                  )}
                  <span className="text-xs text-[#666] ml-auto">
                    {new Date(c.created_at).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                    })}
                  </span>
                </div>
                <p className="text-[#f5f5f0] text-sm mb-1"><span className="text-[#c9a227]">User:</span> {c.user_message}</p>
                <p className="text-[#a0a0a0] text-sm"><span className="text-[#c9a227]">AI:</span> {c.assistant_response}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#c9a22733] p-4">
      <p className="text-2xl text-[#f5f5f0] mb-1">{value.toLocaleString?.() ?? value}</p>
      <p className="text-xs text-[#a0a0a0] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#222] last:border-0">
      <span className="text-[#a0a0a0] text-sm">{label}</span>
      <span className="text-[#f5f5f0] text-lg">{value.toLocaleString?.() ?? value}</span>
    </div>
  );
}

function formatType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
