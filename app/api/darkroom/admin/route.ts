import { NextRequest, NextResponse } from "next/server";
import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversations,
  backfillMissingEmbeddings,
} from "@/lib/darkroom-memory";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  const urlToken = req.nextUrl.searchParams.get("token");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return headerToken || urlToken;
}

function requireAuth(req: NextRequest): { ok: true } | NextResponse {
  const expectedToken = process.env.DARKROOM_ADMIN_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "Admin token not configured" },
      { status: 503 }
    );
  }
  const token = extractToken(req);
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;

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

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "backfill";

    if (action !== "backfill") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const batchSize = Math.min(
      typeof body?.batchSize === "number" ? body.batchSize : 50,
      100
    );
    const updated = await backfillMissingEmbeddings(batchSize);

    return NextResponse.json({
      action: "backfill",
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Darkroom admin backfill error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Backfill failed",
      },
      { status: 500 }
    );
  }
}
