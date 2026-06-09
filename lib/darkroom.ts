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
}

export interface DarkroomData {
  initialEntries: DarkroomEntry[];
  systemPrompt: string;
  fallbackResponses: Record<string, string>;
}

export function getDarkroomData(isZh?: boolean): DarkroomData {
  return (isZh ? darkroomDataZh : darkroomData) as DarkroomData;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function sendDarkroomMessage(
  message: string,
  history: ChatMessage[],
  isZh?: boolean
): Promise<{ content: string; source: string; timestamp: string }> {
  const res = await fetch("/api/darkroom/chat", {
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
