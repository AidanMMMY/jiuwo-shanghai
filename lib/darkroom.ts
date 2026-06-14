import darkroomData from "@/data/darkroom-messages.json";
import darkroomDataZh from "@/data/darkroom-messages-zh.json";

export interface DarkroomEntry {
  id: string;
  timestamp: string;
  location: string;
  action: string;
  message: string;
  tags?: string[];
  type: "log" | "broadcast";
  isTyping?: boolean;
}

export interface DarkroomData {
  initialEntries: DarkroomEntry[];
  initialEntrySets?: DarkroomEntry[][];
  knowledgeBase: string;
  systemPrompt: string;
  extractionPrompt: string;
  fallbackResponses: Record<string, string>;
}

export function getDarkroomData(isZh?: boolean): DarkroomData {
  return (isZh ? darkroomDataZh : darkroomData) as DarkroomData;
}

export function getRandomInitialEntries(isZh?: boolean): DarkroomEntry[] {
  const data = getDarkroomData(isZh);
  const sets = data.initialEntrySets?.length ? data.initialEntrySets : [data.initialEntries];
  const idx = Math.floor(Math.random() * sets.length);
  return sets[idx];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function getApiUrl(): string {
  if (typeof window === "undefined") return "/api/darkroom/chat";
  const origin = window.location.origin;
  // Avoid 308 redirect: apex domain → www subdomain on Vercel
  if (origin.includes("jiuwoshanghai.net") && !origin.includes("www.")) {
    return origin.replace("jiuwoshanghai.net", "www.jiuwoshanghai.net") + "/api/darkroom/chat";
  }
  return origin + "/api/darkroom/chat";
}

export async function sendDarkroomMessage(
  message: string,
  history: ChatMessage[],
  isZh?: boolean
): Promise<{ content: string; source: string; timestamp: string }> {
  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, isZh }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || (isZh ? "信号丢失" : "Signal lost"));
  }

  return res.json();
}
