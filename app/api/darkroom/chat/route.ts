import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import darkroomData from "@/data/darkroom-messages.json";

const SYSTEM_PROMPT = darkroomData.systemPrompt;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Check if API key is available (lazy check)
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      // Fallback: keyword-based response
      const lower = message.toLowerCase();
      let response = darkroomData.fallbackResponses.default;

      if (/hi|hello|hey|你好|在吗/.test(lower)) {
        response = darkroomData.fallbackResponses.greeting;
      } else if (/drink|酒|喝|cocktail|推荐/.test(lower)) {
        response = darkroomData.fallbackResponses.drink;
      } else if (/where|location|地址|在哪|怎么/.test(lower)) {
        response = darkroomData.fallbackResponses.location;
      } else if (/time|时间|几点|开门|close/.test(lower)) {
        response = darkroomData.fallbackResponses.time;
      }

      return NextResponse.json({
        content: response,
        source: "fallback",
        timestamp: new Date().toISOString(),
      });
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
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
    const message = error instanceof Error ? error.message : "Signal lost";
    return NextResponse.json(
      { error: message, content: darkroomData.fallbackResponses.error },
      { status: 500 }
    );
  }
}
