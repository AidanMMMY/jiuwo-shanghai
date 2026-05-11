import { NextRequest, NextResponse } from "next/server";
import { kimiClient, DEFAULT_MODEL } from "@/lib/kimi/client";
import { recordUsage } from "@/lib/kimi/usage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = DEFAULT_MODEL, temperature = 0.7 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const completion = await kimiClient.chat.completions.create({
      model,
      messages,
      temperature,
    });

    const usage = completion.usage;
    if (usage) {
      recordUsage({
        timestamp: new Date().toISOString(),
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      });
    }

    return NextResponse.json({
      content: completion.choices[0]?.message?.content || "",
      usage: usage
        ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Kimi API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
