import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import {
  extractUserMentionedNames,
  updateSessionSummary,
} from "@/lib/darkroom-chat";
import {
  storeMemory,
  extractKeywords,
  storeConversation,
  getUnprocessedConversations,
  markConversationsProcessed,
  findSimilarMemory,
  recordMentionedNames,
} from "@/lib/darkroom-memory";

const BATCH_SIZE = 2;
const MAX_BATCHES_PER_REQUEST = 5; // Process up to 10 conversations per call

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { userMessage, assistantResponse } = body;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    isZh = !!body.isZh;

    if (
      !userMessage ||
      !assistantResponse ||
      typeof userMessage !== "string" ||
      typeof assistantResponse !== "string"
    ) {
      return NextResponse.json(
        { error: isZh ? "输入无效" : "Invalid input" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      console.log("[darkroom:extract] skipped: no_api_key");
      return NextResponse.json({ skipped: true, reason: "no_api_key" });
    }

    const sourceLang = isZh ? "zh" : "en";
    console.log(`[darkroom:extract] start lang=${sourceLang} session=${sessionId || "none"}`);

    // Step 1: always store the raw conversation exchange
    const storedConv = await storeConversation({
      user_message: userMessage,
      assistant_response: assistantResponse,
      source_lang: sourceLang,
      session_id: sessionId || undefined,
    });
    console.log(`[darkroom:extract] conversation stored id=${storedConv.id}`);

    // Record any new names the user mentioned, and update session summary asynchronously
    if (sessionId) {
      const mentionedNames = extractUserMentionedNames(
        [{ role: "user", content: userMessage }],
        isZh
      );
      if (mentionedNames.length > 0) {
        recordMentionedNames(mentionedNames).catch((err) =>
          console.error("[darkroom:extract] record entities error:", err)
        );
      }
      updateSessionSummary(sessionId, userMessage, assistantResponse, isZh).catch((err) =>
        console.error("[darkroom:extract] summary update error:", err)
      );
    }

    const data = getDarkroomData(isZh);
    const extractionPrompt = data.extractionPrompt;

    if (!extractionPrompt) {
      console.log("[darkroom:extract] skipped: no_extraction_prompt");
      return NextResponse.json({ stored: 0, batched: false, reason: "no_extraction_prompt" });
    }

    // Step 2: process backlog in batches
    let totalStored = 0;
    let totalProcessed = 0;
    let totalBatches = 0;
    const storedMemories: Array<{
      id: number;
      content: string;
      keywords: string[];
      confidence: number;
    }> = [];

    for (let batchIndex = 0; batchIndex < MAX_BATCHES_PER_REQUEST; batchIndex++) {
      const pending = await getUnprocessedConversations(sourceLang, BATCH_SIZE);
      console.log(`[darkroom:extract] batch=${batchIndex + 1} pending=${pending.length}`);

      if (pending.length < BATCH_SIZE) {
        break;
      }

      totalBatches++;

      const transcript = pending
        .map(
          (c, i) =>
            isZh
              ? `--- 对话 ${i + 1} ---\n用户：${c.user_message}\n系统：${c.assistant_response}`
              : `--- Exchange ${i + 1} ---\nUser: ${c.user_message}\nSystem: ${c.assistant_response}`
        )
        .join("\n\n");

      const batchPrompt = isZh
        ? `基于以下 ${BATCH_SIZE} 段连续对话，提取 0–4 个值得持久化的记忆。提取两类：\n\n1. **用户事实**：从用户说的话里提取的具体事实（偏好、提到的人、纠正、计划、情绪）。只提取用户明确说过的内容。\n2. **对话综合**：结合用户和系统的多轮内容，提取跨轮的主题、关系动态、用户纠正后的共识、情绪走向。可以从上下文中合理推断，但不要编造系统回复里没有依据的内容。\n\n注意跨对话的重复主题。如果某条信息与已有记忆高度重复，请降低其优先级或不包含。\n\n每条记忆的 keywords 必须同时包含中文和英文表达，覆盖该记忆的核心概念。例如：涉及“酒”的记忆应包含 ['酒', 'drink', 'alcohol']；涉及“喜欢”的记忆应包含 ['喜欢', 'like']。这样不同语言的查询都能召回这条记忆。\n\n${transcript}\n\n请提取记忆：`
        : `Based on the following ${BATCH_SIZE} consecutive exchanges, extract 0–4 memories worth persisting. Extract two types:\n\n1. **User facts**: specific facts from what the user said (preferences, people mentioned, corrections, plans, moods). Only extract what the user explicitly stated.\n2. **Conversation synthesis**: higher-level themes, relationship dynamics, post-correction consensus, or emotional arcs that emerge across the full exchange. You may reasonably infer these from context, but do not fabricate details with no basis in the conversation.\n\nLook for recurring themes across exchanges. If a memory overlaps heavily with existing traces, deprioritize or omit it.\n\nEach memory's keywords MUST include both Chinese and English expressions of its core concepts. For example, a memory involving "drink" should include ['drink', 'alcohol', '酒']; a memory involving "like" should include ['like', '喜欢']. This allows queries in either language to recall the memory.\n\n${transcript}\n\nExtract memories:`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let raw = "";
      try {
        const completion = await deepseekClient.chat.completions.create(
          {
            model: DEFAULT_MODEL,
            messages: [
              { role: "system", content: extractionPrompt },
              { role: "user", content: batchPrompt },
            ],
            temperature: 0.3,
            max_tokens: 600,
          },
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        raw = completion.choices[0]?.message?.content || "";
      } catch (fetchError: unknown) {
        clearTimeout(timeout);
        console.error("[darkroom:extract] deepseek call failed:", fetchError);
        throw fetchError;
      }

      let memories: unknown[] = [];

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memories = parsed;
        }
      } catch {
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (Array.isArray(parsed)) {
              memories = parsed;
            }
          } catch {
            console.log("[darkroom:extract] failed to parse markdown json block");
          }
        }
      }

      console.log(`[darkroom:extract] batch=${batchIndex + 1} raw_memories=${memories.length}`);

      const batchStored = [];

      for (const rawMemory of memories) {
        if (typeof rawMemory !== "object" || rawMemory === null) continue;

        const m = rawMemory as Record<string, unknown>;
        const content = m.content;
        const confidence = m.confidence;

        if (
          typeof content === "string" &&
          content.length > 5 &&
          content.length < 500 &&
          typeof confidence === "number" &&
          confidence >= 0.6 &&
          confidence <= 1.0
        ) {
          const trimmedContent = content.trim();
          let keywords = Array.isArray(m.keywords)
            ? (m.keywords as unknown[])
                .filter((k): k is string => typeof k === "string" && k.length > 0)
                .map((k) => k.toLowerCase().trim())
                .slice(0, 10)
            : [];

          if (keywords.length === 0) {
            keywords = extractKeywords(trimmedContent);
          }

          if (keywords.length === 0) {
            continue;
          }

          // Deduplication check across all languages
          const similar = await findSimilarMemory(trimmedContent, undefined, 0.65);
          if (similar) {
            console.log(
              `[darkroom:extract] deduplicated memory similar_to=${similar.id} content="${trimmedContent.slice(0, 40)}..."`
            );
            continue;
          }

          const memory = await storeMemory({
            content: trimmedContent,
            keywords,
            confidence,
            source_lang: sourceLang,
          });
          batchStored.push(memory);
        }
      }

      // Mark conversations as processed even if no new memories were stored
      // (otherwise they will loop forever)
      await markConversationsProcessed(pending.map((c) => c.id));
      totalProcessed += pending.length;
      totalStored += batchStored.length;
      storedMemories.push(...batchStored);

      console.log(
        `[darkroom:extract] batch=${batchIndex + 1} stored=${batchStored.length} processed=${pending.length}`
      );
    }

    console.log(
      `[darkroom:extract] done batches=${totalBatches} stored=${totalStored} processed=${totalProcessed}`
    );

    return NextResponse.json({
      stored: totalStored,
      batched: totalBatches > 0,
      processed: totalProcessed,
      memories: storedMemories.map((m) => ({
        id: m.id,
        content: m.content,
        keywords: m.keywords,
        confidence: m.confidence,
      })),
    });
  } catch (error: unknown) {
    console.error("[darkroom:extract] fatal error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : (isZh ? "提取失败" : "Extraction failed"),
      },
      { status: 500 }
    );
  }
}
