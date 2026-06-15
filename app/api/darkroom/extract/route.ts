import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import {
  storeMemory,
  extractKeywords,
  storeConversation,
  getUnprocessedConversations,
  markConversationsProcessed,
  findSimilarMemory,
} from "@/lib/darkroom-memory";

const BATCH_SIZE = 2;
const MAX_BATCHES_PER_REQUEST = 5; // Process up to 10 conversations per call

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { userMessage, assistantResponse } = body;
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
    console.log(`[darkroom:extract] start lang=${sourceLang}`);

    // Step 1: always store the raw conversation exchange
    const storedConv = await storeConversation({
      user_message: userMessage,
      assistant_response: assistantResponse,
      source_lang: sourceLang,
    });
    console.log(`[darkroom:extract] conversation stored id=${storedConv.id}`);

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
              ? `--- 用户输入 ${i + 1} ---\n${c.user_message}`
              : `--- User input ${i + 1} ---\n${c.user_message}`
        )
        .join("\n\n");

      const batchPrompt = isZh
        ? `基于以下 ${BATCH_SIZE} 条用户消息，提取 0–3 个值得持久化的记忆。只从用户说的话里提取，不要从系统回复中推断或编造。注意跨消息的重复主题、用户偏好和情绪模式。如果某条信息与已有记忆高度重复，请降低其优先级或不包含。\n\n每条记忆的 keywords 必须同时包含中文和英文表达，覆盖该记忆的核心概念。例如：涉及“酒”的记忆应包含 ['酒', 'drink', 'alcohol']；涉及“喜欢”的记忆应包含 ['喜欢', 'like']。这样不同语言的查询都能召回这条记忆。\n\n${transcript}\n\n请提取记忆：`
        : `Based on the following ${BATCH_SIZE} user messages, extract 0–3 memories worth persisting. Extract ONLY from what the user said. Do not infer or fabricate from the system's responses. Look for recurring themes, user preferences, and emotional patterns across the messages. If a memory overlaps heavily with existing traces, deprioritize or omit it.\n\nEach memory's keywords MUST include both Chinese and English expressions of its core concepts. For example, a memory involving "drink" should include ['drink', 'alcohol', '酒']; a memory involving "like" should include ['like', '喜欢']. This allows queries in either language to recall the memory.\n\n${transcript}\n\nExtract memories:`;

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
