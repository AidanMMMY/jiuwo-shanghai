import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getMemoryById, upsertEntity, recordEntityRelation, findEntityByName } from "@/lib/darkroom-memory";
import { safeJsonParse } from "@/lib/darkroom-chat";

const RELATION_TYPES = [
  "friend",
  "partner",
  "lover",
  "fwb",
  "date",
  "affair",
  "colleague",
  "ex",
  "sibling",
  "crush",
  "knows",
  "mentioned_with",
];

const validRelationTypes = new Set(RELATION_TYPES);

function normalizeEntityName(name: string): string {
  // Strip parenthetical aliases like "小马（Phillip）" -> "小马" or "勺子（AGNOSIA）" -> "勺子".
  const withoutParens = name.replace(/[（(].*?[）)]/g, "").trim();
  if (withoutParens) return withoutParens;
  return name;
}

function buildPrompt(content: string, isZh: boolean): string {
  const typesText = RELATION_TYPES.join(", ");
  if (isZh) {
    return `从以下记忆文本中提取所有明确提到的人物关系。只提取文本中明确陈述或高度可信的关系，不要猜测。

关系类型可选：${typesText}

crush 表示暗恋/好感，knows 表示认识，mentioned_with 表示只是被一起提到。

对于每条关系，如果可以判断是当前关系还是过去关系，请加上 "is_current": true/false。当前关系（正在发生、现在仍是）用 true，过去关系（曾经、前任、以前）用 false。无法判断时默认 true。

输出格式（只返回 JSON，不要解释）：
{
  "relations": [
    {"a": "人物A", "b": "人物B", "type": "关系类型", "is_current": true}
  ]
}

文本：
${content}`;
  }
  return `Extract all explicitly mentioned relationships between people from the following memory text. Only extract relationships that are clearly stated or highly credible; do not guess.

Relation types: ${typesText}

crush means attraction / having a crush on someone, knows means acquainted, mentioned_with means simply mentioned together.

For each relation, add "is_current": true/false if you can tell. Use true for current relationships and false for past ones. Default to true if unclear.

Output format (return JSON only, no explanation):
{
  "relations": [
    {"a": "Person A", "b": "Person B", "type": "relation_type", "is_current": true}
  ]
}

Text:
${content}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memoryId = typeof body.memoryId === "number" ? body.memoryId : undefined;
    let content = typeof body.content === "string" ? body.content : "";
    const isZh = !!body.isZh;

    if (memoryId) {
      const memory = await getMemoryById(memoryId);
      if (!memory) {
        return NextResponse.json({ error: "Memory not found" }, { status: 404 });
      }
      content = memory.content;
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      return NextResponse.json({ skipped: true, reason: "no_api_key" });
    }

    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are a relationship extraction assistant. Output only JSON." },
        { role: "user", content: buildPrompt(content, isZh) },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);
    const relations: Array<{ a: string; b: string; type: string; is_current: boolean }> = [];

    if (parsed && Array.isArray(parsed.relations)) {
      for (const r of parsed.relations) {
        if (
          typeof r === "object" &&
          r !== null &&
          typeof (r as Record<string, unknown>).a === "string" &&
          typeof (r as Record<string, unknown>).b === "string" &&
          typeof (r as Record<string, unknown>).type === "string" &&
          validRelationTypes.has((r as Record<string, unknown>).type as string)
        ) {
          const isCurrent = (r as Record<string, unknown>).is_current;
          relations.push({
            a: normalizeEntityName(((r as Record<string, unknown>).a as string).trim()),
            b: normalizeEntityName(((r as Record<string, unknown>).b as string).trim()),
            type: ((r as Record<string, unknown>).type as string).trim().toLowerCase(),
            is_current: typeof isCurrent === "boolean" ? isCurrent : true,
          });
        }
      }
    }

    const recorded: Array<{ a: string; b: string; type: string; is_current: boolean }> = [];
    const skipped: Array<{ a: string; b: string; type: string; reason: string }> = [];

    for (const r of relations) {
      if (!r.a || !r.b || r.a === r.b) {
        skipped.push({ ...r, reason: "invalid names" });
        continue;
      }

      // Ensure both entities exist.
      let entityA = await findEntityByName(r.a);
      if (!entityA) {
        entityA = await upsertEntity(r.a, { source: "memory", entityType: "person", bumpMention: false });
      }
      let entityB = await findEntityByName(r.b);
      if (!entityB) {
        entityB = await upsertEntity(r.b, { source: "memory", entityType: "person", bumpMention: false });
      }

      if (!entityA || !entityB) {
        skipped.push({ ...r, reason: "entity creation failed" });
        continue;
      }

      await recordEntityRelation(entityA.name, entityB.name, r.type, { confidence: 0.75, isCurrent: r.is_current });
      recorded.push(r);
    }

    return NextResponse.json({
      memoryId,
      raw,
      parsed: parsed ?? null,
      recorded,
      skipped,
      total: relations.length,
    });
  } catch (error: unknown) {
    console.error("[darkroom:extract-relations] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
