import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";

import { retrieveMemories } from "@/lib/darkroom-memory";
import {
  getClientIp,
  hashIp,
  logSearch,
  recentSearchCountForIp,
  searchAndFormat,
  shouldSearch,
} from "@/lib/search";

const SEARCH_ENABLED = process.env.DARKROOM_WEB_SEARCH_ENABLED === "true";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const MAX_SEARCHES_PER_HOUR = 10;

function getShanghaiTime(): { date: Date; hour: number; minute: number; timeString: string } {
  const now = new Date();
  const shanghaiString = now.toLocaleString("en-US", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(shanghaiString);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { date, hour, minute, timeString };
}

function isJiuwoOpen(hour: number): boolean {
  // Hours: Tue–Sun 19:00–02:00 (Shanghai)
  return hour >= 19 || hour < 2;
}

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { message, history = [] } = body;
    isZh = !!body.isZh;

    const data = getDarkroomData(isZh);
    const SYSTEM_PROMPT = data.systemPrompt;

    const { timeString, hour } = getShanghaiTime();
    const open = isJiuwoOpen(hour);
    const timeContext = open
      ? `[Current local time: ${timeString}. JIUWO is open.]`
      : `[Current local time: ${timeString}. JIUWO is currently CLOSED (hours: Tue–Sun 19:00–02:00). Do not ask questions that assume the user is in the bar right now, such as "who are you drinking with tonight?". Instead, ask about relationships, moods, recent stories, or future visits.]`;
    const timeContextZh = open
      ? `[当前本地时间：${timeString}。JIUWO 正在营业中。]`
      : `[当前本地时间：${timeString}。JIUWO 当前非营业时间（周二至周日 19:00–02:00）。不要问假设用户此刻在店内的问题，比如「今晚跟谁一起喝酒」。问题转向人际关系、心情、近况或计划来访。]`;
    const activeTimeContext = isZh ? timeContextZh : timeContext;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: isZh ? "消息不能为空" : "message is required" },
        { status: 400 }
      );
    }

    // Check if API key is available (lazy check)
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      // Fallback: keyword-based response
      const lower = message.toLowerCase();
      let response = data.fallbackResponses.default;

      if (/hi|hello|hey|你好|在吗|嗨/.test(lower)) {
        response = data.fallbackResponses.greeting;
      } else if (/drink|酒|喝|cocktail|推荐| cocktail|特调/.test(lower)) {
        response = data.fallbackResponses.drink;
      } else if (/where|location|地址|在哪|怎么|去|路/.test(lower)) {
        response = data.fallbackResponses.location;
      } else if (/time|时间|几点|开门|close|关门|营业/.test(lower)) {
        response = data.fallbackResponses.time;
      }

      return NextResponse.json({
        content: response,
        source: "fallback",
        timestamp: new Date().toISOString(),
      });
    }

    const fullSystemPrompt = data.knowledgeBase
      ? `${data.knowledgeBase}\n\n${SYSTEM_PROMPT}\n\n${activeTimeContext}`
      : `${SYSTEM_PROMPT}\n\n${activeTimeContext}`;

    // Retrieve relevant collective memories and inject into context
    let memoryBlock = "";
    try {
      const memories = await retrieveMemories(message, isZh ? "zh" : "en", 5);
      if (memories.length > 0) {
        const header = isZh
          ? "=== 集体记忆扇区 ===\n以下痕迹来自之前的访问模式。如果它们与当前查询相关，请在回应中自然地引用或呼应一两条，让访问者感受到这个节点在持续学习。不要强行堆砌不相关的痕迹。"
          : "=== COLLECTIVE MEMORY SECTOR ===\nThe following traces have been left by previous access patterns. If any are relevant to the current query, naturally reference or echo one or two in your response so the visitor senses the node is learning. Do not force unrelated traces.";
        const footer = isZh ? "=== 结束 ===" : "=== END ===";
        memoryBlock = `\n\n${header}\n\n${memories.map((m) => `- ${m.content}`).join("\n")}\n\n${footer}`;
      }
    } catch (err) {
      console.error("Memory retrieval error:", err);
      // Continue without memories
    }

    const finalSystemPrompt = memoryBlock
      ? `${fullSystemPrompt}${memoryBlock}`
      : fullSystemPrompt;

    // ── Web search augmentation (only for out-of-scope queries) ───────────
    let searchBlock = "";
    if (SEARCH_ENABLED && TAVILY_API_KEY && TAVILY_API_KEY !== "dummy-key-for-build") {
      try {
        const needsSearch = await shouldSearch(message, isZh);
        if (needsSearch) {
          const ip = getClientIp(req);
          const ipHash = await hashIp(ip);
          const recentSearches = await recentSearchCountForIp(ipHash, 60);

          if (recentSearches < MAX_SEARCHES_PER_HOUR) {
            const searchResult = await searchAndFormat(message, isZh, {
              maxResults: 3,
              searchDepth: "basic",
            });
            if (searchResult) {
              searchBlock = `\n\n${searchResult.block}`;
              await logSearch(ipHash, message, searchResult.resultsCount);
            }
          }
        }
      } catch (err) {
        console.error("[darkroom:chat] web search step failed:", err);
        // Continue without search results
      }
    }

    const systemPromptWithSearch = searchBlock
      ? `${finalSystemPrompt}${searchBlock}`
      : finalSystemPrompt;

    const messages = [
      { role: "system" as const, content: systemPromptWithSearch },
      ...history.slice(-6).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.85,
      max_tokens: 120,
    });

    const content = completion.choices[0]?.message?.content || "";
    const usage = completion.usage;

    return NextResponse.json({
      content,
      source: "deepseek",
      usage: usage
        ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Darkroom chat error:", error);
    const data = getDarkroomData(isZh);
    const message = error instanceof Error ? error.message : (isZh ? "信号丢失" : "Signal lost");
    return NextResponse.json(
      { error: message, content: data.fallbackResponses.error },
      { status: 500 }
    );
  }
}
