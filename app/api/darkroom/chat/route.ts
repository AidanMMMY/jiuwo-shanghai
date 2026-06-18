import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData, matchKnownEntity } from "@/lib/darkroom";
import {
  TopicState,
  HistoryMessage,
  buildTopicState,
  buildTopicReminder,
  classifyMessageWithModel,
  containsPronoun,
  extractExplicitName,
  extractUserMentionedNames,
  extractUserNameFromHistory,
  formatTopicLockInstruction,
  parseTopicLock,
  resolvePronouns,
  buildIdentityProbeInstruction,
  shouldAskIdentity,
  isNameQuestion,
  looksLikeName,
} from "@/lib/darkroom-chat";

import {
  retrieveMemories,
  searchMemoriesByKeyword,
  filterMemoriesForChat,
  getSessionState,
  getDynamicEntities,
  getRecentConversationsBySession,
  storeMemory,
  upsertSessionState,
  findSimilarMemory,
} from "@/lib/darkroom-memory";
import {
  buildChatPromptWithinBudget,
} from "@/lib/darkroom-budget";
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
    const { message } = body;
    let history = Array.isArray(body.history) ? body.history : [];
    const knownName = typeof body.knownName === "string" ? body.knownName : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    isZh = !!body.isZh;

    const data = getDarkroomData(isZh);
    const SYSTEM_PROMPT = data.systemPrompt;

    // Fetch session state early so we know whether an identity has already
    // been captured or if we have already asked for it this session.
    let sessionState: Awaited<ReturnType<typeof getSessionState>> = null;
    if (sessionId) {
      try {
        sessionState = await getSessionState(sessionId);
      } catch (err) {
        console.error("[darkroom:chat] early session fetch error:", err);
      }
    }

    const { timeString, hour } = getShanghaiTime();
    const open = isJiuwoOpen(hour);
    const timeContext = open
      ? `[Current local time: ${timeString}. JIUWO is open. You do not have live observation of the bar. Do not claim who is currently present, what they are drinking, or where they are sitting.]`
      : `[Current local time: ${timeString}. JIUWO is currently CLOSED (hours: Tue–Sun 19:00–02:00). Do not ask questions that assume the user is in the bar right now, such as "who are you drinking with tonight?". Do not claim knowledge of who is physically present at the bar. You only have records and memories, not live observation. Instead, ask about relationships, moods, recent stories, or future visits.]`;
    const timeContextZh = open
      ? `[当前本地时间：${timeString}。JIUWO 正在营业中。你没有酒吧的实时监控。不要声称谁此刻在场、在喝什么、坐在哪。]`
      : `[当前本地时间：${timeString}。JIUWO 当前非营业时间（周二至周日 19:00–02:00）。不要问假设用户此刻在店内的问题，比如「今晚跟谁一起喝酒」。不要声称知道谁此刻 physically 在场。你只有记录和记忆，没有实时监控。问题转向人际关系、心情、近况或计划来访。]`;
    const activeTimeContext = isZh ? timeContextZh : timeContext;

    const userName = knownName || sessionState?.user_identity || extractUserNameFromHistory(history, isZh) || extractExplicitName(message, isZh);
    let identityReminder = "";
    let identityProbeInstruction = "";

    if (userName) {
      const entity = matchKnownEntity(userName);
      const nameMemories = [];
      try {
        const found = await searchMemoriesByKeyword(userName, 3);
        nameMemories.push(...filterMemoriesForChat(found));
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

    // If we still don't know the user's name and the conversation has been
    // self-referential for a few turns, ask once — politely and without pressure.
    if (sessionId && !userName) {
      const probeSent = !!sessionState?.identity_probe_sent;
      if (shouldAskIdentity(history, isZh, userName, probeSent)) {
        identityProbeInstruction = buildIdentityProbeInstruction(isZh);
        upsertSessionState(sessionId, { identity_probe_sent: true }).catch((err) =>
          console.error("[darkroom:chat] failed to mark identity_probe_sent:", err)
        );
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

    // ── Parallel preparation: classify, fetch session state, memories, entities ─
    let memoryBlock = "";
    let sessionBlock = "";
    let topicState: TopicState;

    try {
      const isAmbiguous =
        containsPronoun(message, isZh) || message.trim().length < 10;
      const memoryLimit = isAmbiguous ? 3 : 5;
      const shouldHydrateHistory = sessionId && history.length === 0;

      const [rawMemories, dynamicEntities, recentConversations] =
        await Promise.all([
          retrieveMemories(message, isZh ? "zh" : "en", memoryLimit),
          getDynamicEntities().catch((err) => {
            console.error("[darkroom:chat] dynamic entities fetch error:", err);
            return [];
          }),
          shouldHydrateHistory
            ? getRecentConversationsBySession(sessionId, 6).catch((err) => {
                console.error("[darkroom:chat] history hydrate error:", err);
                return [];
              })
            : Promise.resolve([]),
        ]);

      // If the frontend did not send history (e.g. fresh page load), rebuild it
      // from the session's stored conversations so topic locking still works.
      if (recentConversations && recentConversations.length > 0) {
        const hydrated = recentConversations
          .map((c) => [
            { role: "user", content: c.user_message },
            { role: "assistant", content: c.assistant_response },
          ])
          .flat();
        history = [...hydrated, { role: "user", content: message }];
        console.log(`[darkroom:chat] hydrated history from db: ${hydrated.length} messages`);
      }

      console.log("[darkroom:chat] history length:", history.length, "session:", sessionId || "none");

      // Run classifier only when there is enough history to disambiguate intent.
      // First-turn greetings are handled fine by the rule-based intent fallback,
      // and skipping the classifier saves one LLM round-trip (~2–3s) on cold starts.
      const shouldClassify = history.length > 1;
      const classifierResult = shouldClassify
        ? await classifyMessageWithModel(message, history, isZh)
        : null;
      console.log("[darkroom:chat] classifier result:", JSON.stringify(classifierResult));

      if (sessionState?.summary) {
        sessionBlock = isZh
          ? `\n\n[本会话摘要：${sessionState.summary}]\n[本会话当前话题对象：${sessionState.primary_entity || "无"}]`
          : `\n\n[Session summary: ${sessionState.summary}]\n[Current session topic: ${sessionState.primary_entity || "none"}]`;
      }

      topicState = buildTopicState(
        history,
        isZh,
        dynamicEntities,
        classifierResult,
        sessionState?.primary_entity ?? undefined
      );

      console.log("[darkroom:chat] topicState:", JSON.stringify(topicState));

      const memories = filterMemoriesForChat(rawMemories);
      if (memories.length > 0) {
        const topicEntity = topicState.primaryEntity;
        const topicNames = topicEntity
          ? new Set([
              topicEntity.toLowerCase(),
              ...(matchKnownEntity(topicEntity)?.aliases.map((a) => a.toLowerCase()) || []),
            ])
          : null;
        const relevant = topicNames
          ? memories.filter((m) =>
              Array.from(topicNames).some((n) => m.content.toLowerCase().includes(n))
            )
          : memories;
        const irrelevant = topicNames
          ? memories.filter(
              (m) => !Array.from(topicNames).some((n) => m.content.toLowerCase().includes(n))
            )
          : [];
        // If there are topic-relevant memories, keep them and allow at most one
        // unrelated memory as background. Otherwise keep everything.
        const displayMemories =
          relevant.length > 0 && topicNames ? [...relevant, ...irrelevant.slice(0, 1)] : memories;

        const header = isZh
          ? `=== 集体记忆扇区 ===\n以下痕迹来自之前的访问模式。当前主要话题对象：${topicEntity || "无"}。请优先引用与「${topicEntity || "当前话题"}」相关的记忆；与当前话题无关的记忆可以忽略，不要让它们把你拉走。这些只是过往记忆，不是当前观察。`
          : `=== COLLECTIVE MEMORY SECTOR ===\nThe following traces have been left by previous access patterns. Current main topic: ${topicEntity || "none"}. Prioritize memories related to "${topicEntity || "the current topic"}"; unrelated memories may be ignored. Do not let memories pull you away. These are PAST memories, not current observations.`;
        const footer = isZh ? "=== 结束 ===" : "=== END ===";
        memoryBlock = `\n\n${header}\n\n${displayMemories.map((m) => `- ${m.content}`).join("\n")}\n\n${footer}`;
      }
    } catch (err) {
      console.error("[darkroom:chat] preparation error:", err);
      topicState = buildTopicState(history, isZh);
    }

    const topicReminder = buildTopicReminder(topicState, isZh);
    const resolvedMessage = resolvePronouns(message, topicState, isZh);
    console.log("[darkroom:chat] resolved message:", resolvedMessage || message);
    const topicLockInstruction = formatTopicLockInstruction(
      topicState.primaryEntity || (isZh ? "无" : "none"),
      isZh
    );

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

    const { systemContent, history: budgetedHistory, dropped } = buildChatPromptWithinBudget(
      {
        knowledgeBase: data.knowledgeBase,
        systemPrompt: SYSTEM_PROMPT,
        activeTimeContext,
        sessionBlock,
        memoryBlock,
        identityReminder,
        identityProbeInstruction,
        topicReminder,
        topicLockInstruction,
        searchBlock,
        history,
        userMessage: resolvedMessage || message,
      },
      isZh
    );

    if (dropped.length > 0) {
      console.log("[darkroom:chat] token budget dropped:", dropped.join(","));
    }

    interface DeepSeekMessage {
      role?: string;
      content?: string | null;
      reasoning_content?: string | null;
    }

    async function callModel(
      systemContent: string,
      modelHistory: HistoryMessage[],
      isRetry = false
    ): Promise<string> {
      const completion = await deepseekClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system" as const, content: systemContent },
          ...modelHistory.slice(-10).map((h: { role: string; content: string }) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user" as const, content: resolvedMessage || message },
        ],
        temperature: 0.65,
        max_tokens: 2048,
        thinking: { type: "enabled" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const rawMessage = completion.choices[0]?.message as DeepSeekMessage;
      console.log("[darkroom:chat] raw message:", JSON.stringify(rawMessage));

      // Never expose reasoning_content to the user; it is internal monologue.
      const rawContent = rawMessage?.content || "";
      if (!rawContent.trim()) {
        console.log(
          "[darkroom:chat] model returned empty content; reasoning:",
          rawMessage?.reasoning_content
        );
        return isZh
          ? "刚才信号没录全，你再说一遍？"
          : "The signal didn't record fully. Say that again?";
      }

      const { topic, cleanContent } = parseTopicLock(rawContent);

      if (
        topic &&
        topicState.primaryEntity &&
        !isRetry
      ) {
        const expected = topicState.primaryEntity.toLowerCase();
        const actual = topic.toLowerCase();
        const normalizedNone = isZh ? "无" : "none";
        if (
          actual !== expected &&
          actual !== normalizedNone &&
          !actual.includes(expected) &&
          !expected.includes(actual)
        ) {
          console.log(
            `[darkroom:chat] topic lock mismatch: expected ${topicState.primaryEntity}, got ${topic}`
          );
          const correction = isZh
            ? `[强制校正] 你刚才错误地把话题对象写成了 "${topic}"。当前话题对象必须是 "${topicState.primaryEntity}"。请重新输出 [TopicLock: ${topicState.primaryEntity}] 并围绕 ${topicState.primaryEntity} 回复。`
            : `[Correction] You incorrectly locked the topic as "${topic}". The current topic must be "${topicState.primaryEntity}". Re-output [TopicLock: ${topicState.primaryEntity}] and reply about ${topicState.primaryEntity}.`;
          return callModel(`${systemContent}\n\n${correction}`, budgetedHistory, true);
        }
      }

      return cleanContent;
    }

    const content = await callModel(systemContent, budgetedHistory);

    // Capture a name if the user just revealed it in this turn.
    let capturedName = userName;
    if (!capturedName && sessionId) {
      let nameFromMessage = extractExplicitName(message, isZh);
      if (!nameFromMessage && history.length > 0) {
        const lastAssistant = history[history.length - 1];
        if (
          lastAssistant?.role === "assistant" &&
          isNameQuestion(lastAssistant.content, isZh) &&
          looksLikeName(message, isZh)
        ) {
          nameFromMessage = message.trim();
        }
      }
      if (nameFromMessage && nameFromMessage !== sessionState?.user_identity) {
        capturedName = nameFromMessage;
        (async () => {
          try {
            const identityContent = isZh
              ? `用户自我介绍为「${capturedName}」`
              : `User introduced themselves as "${capturedName}"`;
            const similar = await findSimilarMemory(identityContent, undefined, 0.65);
            if (!similar) {
              await storeMemory({
                content: identityContent,
                keywords: [capturedName!, isZh ? "名字" : "name", isZh ? "身份" : "identity", isZh ? "用户" : "user"],
                confidence: 0.95,
                source_lang: isZh ? "zh" : "en",
                memory_type: "self_fact",
                source_identity: capturedName,
              });
            }
            await upsertSessionState(sessionId, { user_identity: capturedName });
          } catch (err) {
            console.error("[darkroom:chat] identity memory/store failed:", err);
          }
        })();
      }
    }

    return NextResponse.json({
      content,
      source: "deepseek",
      recognizedName: capturedName || null,
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
