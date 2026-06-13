import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import { storeMemory, extractKeywords } from "@/lib/darkroom-memory";

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

    const data = getDarkroomData(isZh);
    const extractionPrompt = data.extractionPrompt;

    if (!extractionPrompt) {
      return NextResponse.json({ skipped: true, reason: "no_extraction_prompt" });
    }

    const prompt = isZh
      ? `用户查询：${userMessage}\n\n系统响应：${assistantResponse}\n\n请提取记忆：`
      : `User query: ${userMessage}\n\nSystem response: ${assistantResponse}\n\nExtract memories:`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let raw = "";
    try {
      const completion = await deepseekClient.chat.completions.create(
        {
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: extractionPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 400,
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

    // Try direct JSON parse first
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memories = parsed;
      }
    } catch {
      // Try extracting JSON from markdown code block
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

    const sourceLang = isZh ? "zh" : "en";
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

    return NextResponse.json({
      stored: stored.length,
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
