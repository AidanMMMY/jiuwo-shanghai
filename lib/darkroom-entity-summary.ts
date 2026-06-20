import { deepseekClient, DEFAULT_MODEL } from "./deepseek/client";
import {
  Entity,
  getEntityRelations,
  getMemoriesForEntity,
  getEntityById,
  getEntityNamesByIds,
  getDynamicEntities,
  upsertEntity,
} from "./darkroom-memory";

interface SummarizedProfile {
  description?: string;
  preferences?: string[];
  known_facts?: string[];
  relationship_hints?: string;
  confidence?: number;
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw
      .replace(/^[\s\S]*?(\{)/, "$")
      .replace(/(\})[\s\S]*$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore parsing errors.
  }
  return null;
}

export async function summarizeEntityProfile(
  entityId: number,
  isZh = true
): Promise<boolean> {
  const entity = await getEntityById(entityId);
  if (!entity) return false;

  const [memories, relations] = await Promise.all([
    getMemoriesForEntity(entityId, 20),
    getEntityRelations(entityId),
  ]);

  if (memories.length < 2 && relations.length === 0) return false;

  const relationTexts = await formatRelationTexts(entity, relations, isZh);

  const memoryTexts = memories.map((m) => `- ${m.content}`).join("\n");
  const relationBlock =
    relationTexts.length > 0
      ? isZh
        ? `已知关系：\n${relationTexts.join("\n")}`
        : `Known relations:\n${relationTexts.join("\n")}`
      : "";

  const system = isZh
    ? `你是一位整理酒吧熟客档案的助手。根据提供的记忆和关系，生成一段简洁的人物摘要。
只输出 JSON，不要解释。
输出字段：
- description: 100 字内的人物身份/画像
- preferences: 数组，该人物明显的偏好（饮品、座位、活动等），最多 5 条
- known_facts: 数组，关于该人物的可确认事实，最多 5 条
- relationship_hints: 字符串，50 字内，关于该人物与其他人的关系提示
- confidence: 0-1 之间的数字，表示以上摘要的整体可信度

注意：只基于提供的记忆总结，不要编造。如果信息不足，降低 confidence。`
    : `You are an assistant summarizing a regular's profile for a bar. Based on the provided memories and relations, generate a concise profile.
Output ONLY JSON, no explanation.
Fields:
- description: identity/portrait within 100 characters
- preferences: array of obvious preferences (drinks, seats, activities), max 5
- known_facts: array of confirmable facts, max 5
- relationship_hints: string, within 50 characters, hint about relations with others
- confidence: number 0-1, overall confidence of the summary

Only summarize from provided memories. Do not invent. Lower confidence if information is scarce.`;

  const user = isZh
    ? `人物：${entity.name}\n\n记忆：\n${memoryTexts}\n\n${relationBlock}\n\n请生成 JSON 摘要：`
    : `Person: ${entity.name}\n\nMemories:\n${memoryTexts}\n\n${relationBlock}\n\nGenerate JSON summary:`;

  try {
    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: 512,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);
    if (!parsed) {
      console.error(`[entity-summary] failed to parse summary for ${entity.name}`);
      return false;
    }

    const summary: SummarizedProfile = {
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      preferences: Array.isArray(parsed.preferences)
        ? parsed.preferences.filter((p): p is string => typeof p === "string").slice(0, 5)
        : undefined,
      known_facts: Array.isArray(parsed.known_facts)
        ? parsed.known_facts.filter((f): f is string => typeof f === "string").slice(0, 5)
        : undefined,
      relationship_hints:
        typeof parsed.relationship_hints === "string" ? parsed.relationship_hints : undefined,
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
    };

    const profile = {
      ...entity.profile,
      ...summary,
      summary_updated_at: new Date().toISOString(),
    };

    await upsertEntity(entity.name, {
      source: entity.source,
      entityType: entity.entity_type,
      profile,
      bumpMention: false,
    });

    console.log(`[entity-summary] summarized ${entity.name} confidence=${profile.confidence}`);
    return true;
  } catch (err) {
    console.error(`[entity-summary] failed for ${entity.name}:`, err);
    return false;
  }
}

export async function summarizeAllEntityProfiles(
  options: { limit?: number; minMentionCount?: number; isZh?: boolean } = {}
): Promise<number> {
  const entities = await getDynamicEntities();

  const { limit = 50, minMentionCount = 2, isZh = true } = options;
  let processed = 0;

  for (const entity of entities) {
    if (processed >= limit) break;
    if ((entity.mention_count || 0) < minMentionCount && entity.source !== "knowledge_base") {
      continue;
    }
    const ok = await summarizeEntityProfile(entity.id, isZh);
    if (ok) processed++;
  }

  return processed;
}

async function formatRelationTexts(
  entity: Entity,
  relations: Awaited<ReturnType<typeof getEntityRelations>>,
  isZh: boolean
): Promise<string[]> {
  if (relations.length === 0) return [];
  const relatedIds = relations.map((r) =>
    r.entity_a_id === entity.id ? r.entity_b_id : r.entity_a_id
  );
  const idToName = await getEntityNamesByIds(relatedIds);

  return relations.slice(0, 5).map((r) => {
    const otherName = idToName.get(
      r.entity_a_id === entity.id ? r.entity_b_id : r.entity_a_id
    );
    return isZh
      ? `与 ${otherName || "某人"} 的关系：${r.relation_type}`
      : `Relation with ${otherName || "someone"}: ${r.relation_type}`;
  });
}
