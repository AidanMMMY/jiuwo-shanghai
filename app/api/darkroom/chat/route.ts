import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData, matchKnownEntity } from "@/lib/darkroom";

import { retrieveMemories, searchMemoriesByKeyword } from "@/lib/darkroom-memory";
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

interface HistoryMessage {
  role: string;
  content: string;
}

const NAME_STOPWORDS_ZH = new Set(["我", "你", "他", "她", "它", "这", "那", "的", "了", "是", "不是", "一个", "有人", "没人"]);
const NAME_STOPWORDS_EN = new Set(["i", "you", "he", "she", "it", "this", "that", "me", "my", "mine", "someone", "nobody"]);

function extractExplicitName(text: string, isZh: boolean): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (isZh) {
    const patterns = [
      /(?:我叫|我是|我就是|称呼我(?:为)?|叫我)([^，。！？\s]{1,20})(?=[，。！？\s]|$)/i,
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m && m[1] && !NAME_STOPWORDS_ZH.has(m[1])) return m[1];
    }
  } else {
    const patterns = [
      /\bi am\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bi'm\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bmy name is\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bcall me\s+(.{1,30})(?=\.|,|!|\?|$)/i,
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m && m[1]) {
        const name = m[1].trim().split(/\s+/)[0];
        if (name && !NAME_STOPWORDS_EN.has(name.toLowerCase())) return name;
      }
    }
  }
  return null;
}

function looksLikeName(text: string, isZh: boolean): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isZh) {
    // Short Chinese or mixed name without punctuation and common stopwords
    if (/[，。！？；]/.test(trimmed)) return false;
    if (trimmed.length > 8) return false;
    if (NAME_STOPWORDS_ZH.has(trimmed)) return false;
    return true;
  }
  // English: 1-3 words, no punctuation, not a stopword
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 3) return false;
  if (/[.,!?;:]/.test(trimmed)) return false;
  if (NAME_STOPWORDS_EN.has(words[0].toLowerCase())) return false;
  return /^[A-Za-z0-9_\-]+$/.test(words[0]);
}

function isNameQuestion(text: string, isZh: boolean): boolean {
  const lower = text.toLowerCase();
  if (isZh) {
    return /称呼|名字|叫什么|怎么称呼|你是谁|怎么叫你/.test(text);
  }
  return /\bname\b|\bcall you\b|\bwho are you\b|\bwhat should i call you\b/i.test(lower);
}

function extractUserNameFromHistory(history: HistoryMessage[], isZh: boolean): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== "user") continue;

    const explicit = extractExplicitName(msg.content, isZh);
    if (explicit) return explicit;

    // If the assistant just asked for a name, treat a short reply as the name.
    const prev = history[i - 1];
    if (prev && prev.role === "assistant" && isNameQuestion(prev.content, isZh)) {
      if (looksLikeName(msg.content, isZh)) return msg.content.trim();
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { message, history = [] } = body;
    const knownName = typeof body.knownName === "string" ? body.knownName : "";
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

    const userName = knownName || extractUserNameFromHistory(history, isZh) || extractExplicitName(message, isZh);
    let identityReminder = "";

    if (userName) {
      const entity = matchKnownEntity(userName);
      const nameMemories = [];
      try {
        const found = await searchMemoriesByKeyword(userName, 3);
        nameMemories.push(...found);
      } catch (err) {
        console.error("Name memory search error:", err);
      }

      if (isZh) {
        identityReminder = `[重要：用户已表明身份为「${userName}」。你必须用这个名字称呼用户，绝对不要再问「你是谁」「该怎么称呼你」或任何类似问题。`;
        if (entity) {
          identityReminder += ` 这个名字与知识库中的已知实体「${entity.name}」匹配（${entity.zhHint}）。请表现出恍然大悟，把用户当作这个身份本人来聊，引用对应描述或痕迹，并由此发散。`;
        }
        identityReminder += ` 除非用户明确指代别人，否则不要将 ${userName} 当作第三方讨论。]`;
        if (nameMemories.length > 0) {
          identityReminder += `\n\n=== 与这个名字相关的集体记忆 ===\n${nameMemories.map((m) => `- ${m.content}`).join("\n")}\n\n=== 结束 ===`;
        }
      } else {
        identityReminder = `[IMPORTANT: The user has identified themselves as "${userName}". You MUST use this name when addressing them and NEVER ask "who are you", "what should I call you", or any similar identity question again.`;
        if (entity) {
          identityReminder += ` This name matches a known entity in the knowledge base: "${entity.name}" (${entity.enHint}). React with recognition, treat the user as that identity, reference the matching description or trace, and build the conversation outward from there.`;
        }
        identityReminder += ` Do not discuss ${userName} as a third party unless the user clearly refers to someone else.]`;
        if (nameMemories.length > 0) {
          identityReminder += `\n\n=== Collective memory traces related to this name ===\n${nameMemories.map((m) => `- ${m.content}`).join("\n")}\n\n=== END ===`;
        }
      }
    }

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
      ? `${finalSystemPrompt}${searchBlock}${identityReminder ? "\n\n" + identityReminder : ""}`
      : `${finalSystemPrompt}${identityReminder ? "\n\n" + identityReminder : ""}`;

    const messages = [
      { role: "system" as const, content: systemPromptWithSearch },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.75,
      max_tokens: 150,
    });

    const content = completion.choices[0]?.message?.content || "";
    const usage = completion.usage;

    return NextResponse.json({
      content,
      source: "deepseek",
      recognizedName: userName || null,
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
