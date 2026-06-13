import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";

import { retrieveMemories } from "@/lib/darkroom-memory";

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { message, history = [] } = body;
    isZh = !!body.isZh;

    const data = getDarkroomData(isZh);
    const SYSTEM_PROMPT = data.systemPrompt;

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
      ? `${data.knowledgeBase}\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT;

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

    const messages = [
      { role: "system" as const, content: finalSystemPrompt },
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
