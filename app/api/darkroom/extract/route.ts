import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import {
  storeMemory,
  extractKeywords,
  storeConversation,
  getUnprocessedConversations,
  markConversationsProcessed,
} from "@/lib/darkroom-memory";

const BATCH_SIZE = 3;

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
      return NextResponse.json({ skipped: true, reason: "no_api_key" });
    }

    const sourceLang = isZh ? "zh" : "en";

    // Step 1: always store the raw conversation exchange
    await storeConversation({
      user_message: userMessage,
      assistant_response: assistantResponse,
      source_lang: sourceLang,
    });

    // Step 2: check if we have enough unprocessed exchanges to synthesize memories
    const pending = await getUnprocessedConversations(sourceLang, BATCH_SIZE);
    if (pending.length < BATCH_SIZE) {
      return NextResponse.json({ stored: 0, batched: false, pending: pending.length });
    }

    // Step 3: batch synthesize memories from the pending exchanges
    const data = getDarkroomData(isZh);
    const extractionPrompt = data.extractionPrompt;

    if (!extractionPrompt) {
      return NextResponse.json({ stored: 0, batched: false, reason: "no_extraction_prompt" });
    }

    const transcript = pending
      .map(
        (c, i) =>
          isZh
            ? `--- 对话 ${i + 1} ---\n用户：${c.user_message}\n系统：${c.assistant_response}`
            : `--- Exchange ${i + 1} ---\nUser: ${c.user_message}\nSystem: ${c.assistant_response}`
      )
      .join("\n\n");

    const batchPrompt = isZh
      ? `基于以下 ${BATCH_SIZE} 段连续对话，综合提取 0–3 个值得持久化的记忆。注意跨对话的重复主题、用户偏好和情绪模式。\n\n${transcript}\n\n请提取记忆：`
      : `Based on the following ${BATCH_SIZE} consecutive exchanges, synthesize 0–3 memories worth persisting. Look for recurring themes, user preferences, and emotional patterns across the exchanges.\n\n${transcript}\n\nExtract memories:`;

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
          // Failed to parse code block
        }
      }
    }

    const stored = [];

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
        confidence >= 0.7 &&
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
          keywords = extractKeywords(trimmedContent, sourceLang);
        }

        if (keywords.length === 0) {
          continue;
        }

        const memory = await storeMemory({
          content: trimmedContent,
          keywords,
          confidence,
          source_lang: sourceLang,
        });
        stored.push(memory);
      }
    }

    // Mark conversations as processed only if extraction succeeded (even if no memories met threshold)
    await markConversationsProcessed(pending.map((c) => c.id));

    return NextResponse.json({
      stored: stored.length,
      batched: true,
      memories: stored.map((m) => ({
        id: m.id,
        content: m.content,
        keywords: m.keywords,
        confidence: m.confidence,
      })),
    });
  } catch (error: unknown) {
    console.error("Darkroom extract error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : (isZh ? "提取失败" : "Extraction failed"),
      },
      { status: 500 }
    );
  }
}
