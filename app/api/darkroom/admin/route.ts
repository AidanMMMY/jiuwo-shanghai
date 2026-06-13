import { NextRequest, NextResponse } from "next/server";
import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversations,
} from "@/lib/darkroom-memory";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.DARKROOM_ADMIN_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "Admin token not configured" },
      { status: 503 }
    );
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [memoryStats, recentMemories, conversationStats, recentConversations] =
      await Promise.all([
        getMemoryStats(),
        getRecentMemories(20),
        getConversationStats(),
        getRecentConversations(20),
      ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      memories: {
        stats: memoryStats,
        recent: recentMemories,
      },
      conversations: {
        stats: conversationStats,
        recent: recentConversations,
      },
    });
  } catch (error: unknown) {
    console.error("Darkroom admin insights error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load insights",
      },
      { status: 500 }
    );
  }
}
