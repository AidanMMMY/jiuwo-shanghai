import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import {
  extractUserMentionedNames,
  safeJsonParseArray,
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
  mergeSimilarMemory,
  scrubPii,
  normalizeKeywords,
} from "@/lib/darkroom-memory";

const BATCH_SIZE = 5;
const MAX_BATCHES_PER_REQUEST = 4; // Process up to 20 conversations per call

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
        ? `基于以下 ${BATCH_SIZE} 段连续对话，提取 0–4 个值得持久化的记忆。每条记忆必须包含以下字段：

{
  "content": "记忆内容（简洁、具体、不含敏感信息）",
  "keywords": ["关键词1", "keyword1", "关键词2", "keyword2"],
  "confidence": 0.85,
  "memory_type": "user_fact | system_inferred | correction"
}

类型说明：
- user_fact：用户明确说出的具体事实（偏好、提到的人、计划、情绪）。
- correction：用户纠正、否认或澄清系统之前的理解。
- system_inferred：系统从对话中合理推断出的关系动态或总结，但不是用户直接陈述的事实。

注意跨对话的重复主题。如果某条信息与已有记忆高度重复，请降低其优先级或不包含。

${transcript}

请提取记忆，只返回 JSON 数组：`
        : `Based on the following ${BATCH_SIZE} consecutive exchanges, extract 0–4 memories worth persisting. Each memory must include these fields:

{
  "content": "Concise, specific memory content without sensitive info",
  "keywords": ["keyword1", "关键词1", "keyword2", "关键词2"],
  "confidence": 0.85,
  "memory_type": "user_fact | system_inferred | correction"
}

Types:
- user_fact: a concrete fact the user explicitly stated (preference, person, plan, mood).
- correction: the user corrects, denies, or clarifies something the system previously said.
- system_inferred: a reasonable inference about relationship dynamics or summary, not directly stated by the user.

Look for recurring themes across exchanges. If a memory overlaps heavily with existing traces, deprioritize or omit it.

${transcript}

Extract memories as a JSON array only:`;

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

      const parsed = safeJsonParseArray(raw);
      if (parsed) {
        memories = parsed;
      } else {
        console.log("[darkroom:extract] failed to parse memories JSON");
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
          let rawKeywords = Array.isArray(m.keywords)
            ? (m.keywords as unknown[])
                .filter((k): k is string => typeof k === "string" && k.length > 0)
                .map((k) => k.trim())
            : [];

          if (rawKeywords.length === 0) {
            rawKeywords = extractKeywords(trimmedContent);
          }

          const keywords = normalizeKeywords(rawKeywords);

          if (keywords.length === 0) {
            continue;
          }

          const memoryType =
            typeof m.memory_type === "string" &&
            ["user_fact", "system_inferred", "correction"].includes(m.memory_type)
              ? (m.memory_type as "user_fact" | "system_inferred" | "correction")
              : /纠正|更正|否认|澄清|correction|deny|clarify/i.test(trimmedContent)
              ? "correction"
              : "user_fact";

          const scrubbedContent = scrubPii(trimmedContent);

          // Corrections should be stored as clean, separate memories rather than
          // merged into the false memory they contradict. Merging would dilute the
          // correction or resurrect the false claim.
          if (memoryType === "correction") {
            const memory = await storeMemory({
              content: scrubbedContent,
              keywords,
              confidence,
              source_lang: sourceLang,
              memory_type: memoryType,
            });
            batchStored.push(memory);
            continue;
          }

          // Deduplication check across all languages
          const similar = await findSimilarMemory(scrubbedContent, undefined, 0.65);
          if (similar) {
            // If the existing memory is a correction, do not overwrite it with a
            // potentially contradictory user_fact. Keep the correction authoritative.
            if (similar.memory_type === "correction") {
              console.log(
                `[darkroom:extract] skipping store: similar_to_correction=${similar.id} content="${scrubbedContent.slice(0, 40)}..."`
              );
              continue;
            }
            console.log(
              `[darkroom:extract] merging memory similar_to=${similar.id} content="${scrubbedContent.slice(0, 40)}..."`
            );
            const merged = await mergeSimilarMemory(similar.id, {
              content: scrubbedContent,
              keywords,
              confidence,
              source_lang: sourceLang,
              memory_type: memoryType,
            });
            if (merged) {
              batchStored.push(merged);
            }
            continue;
          }

          const memory = await storeMemory({
            content: scrubbedContent,
            keywords,
            confidence,
            source_lang: sourceLang,
            memory_type: memoryType,
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
