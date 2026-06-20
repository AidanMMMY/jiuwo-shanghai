import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";
import {
  extractUserMentionedNames,
  extractEntitiesFromText,
  safeJsonParseArray,
  safeJsonParse,
  updateSessionSummary,
} from "@/lib/darkroom-chat";
import {
  storeMemory,
  extractKeywords,
  storeConversation,
  getUnprocessedConversations,
  markConversationsProcessed,
  findSimilarMemory,
  recordMentionedNames,
  mergeSimilarMemory,
  scrubPii,
  normalizeKeywords,
  getSessionIdentities,
  upsertSessionState,
  upsertEntity,
  linkMemoryToEntities,
  recordEntityRelation,
  getDynamicEntities,
  findEntityByName,
  type Entity,
} from "@/lib/darkroom-memory";

const BATCH_SIZE = 5;
const MAX_BATCHES_PER_REQUEST = 4; // Process up to 20 conversations per call

function buildKnownEntitiesHint(entities: Entity[], isZh: boolean): string {
  if (entities.length === 0) return "";
  const lines = entities
    .filter((e) => e.entity_type === "person" || !e.entity_type)
    .map((e) => {
      const aliases = e.aliases.length > 0 ? `（${e.aliases.join("、")}）` : "";
      return `- ${e.name}${aliases}`;
    });
  if (lines.length === 0) return "";
  return isZh
    ? `\n以下是我们已经知道的人物。如果用户提到他们的别名，请使用规范名：\n${lines.join("\n")}\n`
    : `\nPeople already known to the system. If the user mentions an alias, use the canonical name:\n${lines.join("\n")}\n`;
}

interface ProcessEntitiesOptions {
  isZh: boolean;
  extractedEntities: unknown[];
  extractedRelations: unknown[];
  storedMemories: Array<{ id: number; content: string }>;
  identity?: string;
}

async function processExtractedEntitiesAndRelations(
  options: ProcessEntitiesOptions
): Promise<void> {
  const { isZh, extractedEntities, extractedRelations, storedMemories, identity } = options;

  // Upsert extracted entities and build a name -> entity map.
  const entityNameToId = new Map<string, number>();
  for (const raw of extractedEntities) {
    if (typeof raw !== "object" || raw === null) continue;
    const e = raw as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim() : "";
    if (!name || name.length < 2) continue;

    const aliases = Array.isArray(e.aliases)
      ? e.aliases.filter((a): a is string => typeof a === "string").map((a) => a.trim())
      : [];
    const entityType = typeof e.type === "string" ? e.type : "person";

    const entity = await upsertEntity(name, {
      aliases,
      source: "memory",
      entityType,
      bumpMention: false,
    });
    if (entity) {
      entityNameToId.set(name.toLowerCase(), entity.id);
      for (const alias of entity.aliases) {
        entityNameToId.set(alias.toLowerCase(), entity.id);
      }
    }
  }

  // Also ensure the known user identity is in the map.
  if (identity) {
    const userEntity = await upsertEntity(identity, {
      source: "memory",
      entityType: "person",
      profile: { is_user: true },
      bumpMention: false,
    });
    if (userEntity) {
      entityNameToId.set(identity.toLowerCase(), userEntity.id);
    }
  }

  // Link stored memories to entities mentioned in their content.
  for (const memory of storedMemories) {
    const namesFromContent = extractEntitiesFromText(memory.content, isZh);
    // Also match against extracted entity names/aliases.
    const matchedNames: string[] = [...namesFromContent];
    for (const lowerName of entityNameToId.keys()) {
      const regex = new RegExp(
        `(^|[^a-zA-Z0-9一-龥])${lowerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-zA-Z0-9一-龥])`,
        "i"
      );
      if (regex.test(memory.content)) {
        const entity = await findEntityByName(lowerName);
        if (entity && !matchedNames.some((n) => n.toLowerCase() === lowerName)) {
          matchedNames.push(entity.name);
        }
      }
    }

    if (matchedNames.length > 0) {
      await linkMemoryToEntities(memory.id, matchedNames, {
        subjectName: identity,
        confidence: 0.8,
        source: "memory",
      });
    }
  }

  // Record relations.
  const validRelationTypes = new Set([
    "friend",
    "partner",
    "lover",
    "fwb",
    "date",
    "affair",
    "colleague",
    "ex",
    "sibling",
    "knows",
    "mentioned_with",
  ]);
  for (const raw of extractedRelations) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const a = typeof r.a === "string" ? r.a.trim() : "";
    const b = typeof r.b === "string" ? r.b.trim() : "";
    const type = typeof r.type === "string" ? r.type.trim().toLowerCase() : "";
    if (!a || !b || a === b || !validRelationTypes.has(type)) continue;

    await recordEntityRelation(a, b, type, { confidence: 0.75 });
  }
}

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    const { userMessage, assistantResponse } = body;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    isZh = !!body.isZh;
    const backfill = body.backfill === true;

    if (!backfill) {
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
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      console.log("[darkroom:extract] skipped: no_api_key");
      return NextResponse.json({ skipped: true, reason: "no_api_key" });
    }

    const sourceLang = isZh ? "zh" : "en";
    console.log(`[darkroom:extract] start lang=${sourceLang} session=${sessionId || "none"} backfill=${backfill}`);

    if (!backfill) {
      // Ensure the session row exists before storing conversations; the
      // darkroom_conversations table has a foreign key on darkroom_sessions.
      if (sessionId) {
        await upsertSessionState(sessionId, {});
      }

      // Step 1: always store the raw conversation exchange
      const storedConv = await storeConversation({
        user_message: userMessage,
        assistant_response: assistantResponse,
        source_lang: sourceLang,
        session_id: sessionId || undefined,
      });
      console.log(`[darkroom:extract] conversation stored id=${storedConv.id}`);

      // Record any new names the user mentioned, and update session summary asynchronously
      if (sessionId) {
        const mentionedNames = extractUserMentionedNames(
          [{ role: "user", content: userMessage }],
          isZh
        );
        if (mentionedNames.length > 0) {
          recordMentionedNames(mentionedNames).catch((err) =>
            console.error("[darkroom:extract] record entities error:", err)
          );
        }
        updateSessionSummary(sessionId, userMessage, assistantResponse, isZh).catch((err) =>
          console.error("[darkroom:extract] summary update error:", err)
        );
      }
    }

    const data = getDarkroomData(isZh);
    const extractionPrompt = data.extractionPrompt;

    if (!extractionPrompt) {
      console.log("[darkroom:extract] skipped: no_extraction_prompt");
      return NextResponse.json({ stored: 0, batched: false, reason: "no_extraction_prompt" });
    }

    // Step 2: process backlog in batches, grouped by session so that known
    // user identity can be passed into the extraction prompt and attached to
    // stored memories as source_identity.
    let totalStored = 0;
    let totalProcessed = 0;
    let totalBatches = 0;
    const storedMemories: Array<{
      id: number;
      content: string;
      keywords: string[];
      confidence: number;
    }> = [];

    const maxConversations = BATCH_SIZE * MAX_BATCHES_PER_REQUEST;
    const pending = await getUnprocessedConversations(sourceLang, maxConversations);
    console.log(`[darkroom:extract] pending=${pending.length}`);

    if (pending.length > 0) {
      const sessionIds = [
        ...new Set(pending.map((c) => c.session_id).filter((s): s is string => !!s)),
      ];
      const identityMap = await getSessionIdentities(sessionIds);

      // Fetch known/dynamic entities so the extraction model can normalize
      // aliases (e.g. 老王 -> Tee) and emit consistent entity names.
      const dynamicEntities = await getDynamicEntities().catch((err) => {
        console.error("[darkroom:extract] dynamic entities fetch error:", err);
        return [];
      });
      const knownEntitiesHint = buildKnownEntitiesHint(dynamicEntities, isZh);

      // Group by session_id so each batch has consistent identity context.
      const groups = new Map<string, typeof pending>();
      for (const conv of pending) {
        const sid = conv.session_id || "__none__";
        if (!groups.has(sid)) groups.set(sid, []);
        groups.get(sid)!.push(conv);
      }

      batchLoop: for (const [sessionId, group] of groups) {
        const identity = identityMap[sessionId];

        for (let i = 0; i < group.length; i += BATCH_SIZE) {
          if (totalBatches >= MAX_BATCHES_PER_REQUEST) break batchLoop;

          const batch = group.slice(i, i + BATCH_SIZE);
          totalBatches++;

          const transcript = batch
            .map((c, idx) => {
              const identityPrefix = identity
                ? isZh
                  ? `[用户身份：${identity}]`
                  : `[User identity: ${identity}]`
                : "";
              return isZh
                ? `--- 对话 ${idx + 1} ${identityPrefix} ---\n用户：${c.user_message}\n系统：${c.assistant_response}`
                : `--- Exchange ${idx + 1} ${identityPrefix} ---\nUser: ${c.user_message}\nSystem: ${c.assistant_response}`;
            })
            .join("\n\n");

          const identityHint = identity
            ? isZh
              ? `注意：以上对话中标记了 [用户身份：${identity}] 的，表示用户已表明自己叫 ${identity}。用户用“我/我的”说出的内容，是关于 ${identity} 自己的事实，请标记为 memory_type: self_fact。`
              : `Note: exchanges tagged with [User identity: ${identity}] mean the user has identified themselves as ${identity}. Statements using "I/my" are about ${identity} themselves; tag them as memory_type: self_fact.`
            : "";

          const batchPrompt = isZh
            ? `基于以下 ${batch.length} 段连续对话，提取 0–4 个值得持久化的记忆，以及对话中提到的人物实体和人物关系。

每条记忆必须包含以下字段：

{
  "content": "记忆内容（简洁、具体、不含敏感信息）",
  "keywords": ["关键词1", "keyword1", "关键词2", "keyword2"],
  "confidence": 0.85,
  "memory_type": "user_fact | system_inferred | correction | self_fact"
}

类型说明：
- user_fact：用户明确说出的具体事实（偏好、提到的人、计划、情绪）。
- correction：用户纠正、否认或澄清系统之前的理解。
- system_inferred：系统从对话中合理推断出的关系动态或总结，但不是用户直接陈述的事实。
- self_fact：当已知用户身份且用户用第一人称讲关于自己的事实（偏好、计划、情绪）。

时间信息：
- 如果用户消息中包含时间线索（如「去年夏天」、「上周三」、「最近」、「以前」、「目前」、「计划下个月」等），请把该时间描述明确写进 content 开头。
- 保留用户原话中的相对时间描述，不要换算成绝对日期。例如「去年夏天」保留为「去年夏天」，不要写成「2025年夏天」。
- 同时把时间描述词加入 keywords 数组，例如「去年夏天」、「最近」、「目前」、「计划中」。

输出格式改为单个 JSON 对象：
{
  "memories": [...],
  "entities": [{"name": "小马", "aliases": ["Phillip"], "type": "person"}],
  "relations": [{"a": "小马", "b": "阿林", "type": "partner"}]
}

关系类型可选：friend（朋友）、partner（伴侣/恋人）、lover（恋人/爱人）、fwb（friends with benefits）、date（约会中/约会过）、affair（婚外情/外遇/私情）、colleague（同事）、ex（前任）、sibling（兄弟姐妹）、knows（认识）、mentioned_with（一起被提到）。
${identityHint}
${knownEntitiesHint}
注意跨对话的重复主题。如果某条信息与已有记忆高度重复，请降低其优先级或不包含。

${transcript}

请提取，只返回 JSON 对象：`
            : `Based on the following ${batch.length} consecutive exchanges, extract 0–4 memories worth persisting, plus any people mentioned and relationships between them.

Each memory must include these fields:

{
  "content": "Concise, specific memory content without sensitive info",
  "keywords": ["keyword1", "关键词1", "keyword2", "关键词2"],
  "confidence": 0.85,
  "memory_type": "user_fact | system_inferred | correction | self_fact"
}

Types:
- user_fact: a concrete fact the user explicitly stated (preference, person, plan, mood).
- correction: the user corrects, denies, or clarifies something the system previously said.
- system_inferred: a reasonable inference about relationship dynamics or summary, not directly stated by the user.
- self_fact: when the user's identity is known and they use first-person to state a fact about themselves (preference, plan, mood).

Temporal information:
- If the user's message contains a time reference (e.g. "last summer", "last Wednesday", "recently", "before", "currently", "planning next month"), include that time reference at the beginning of the content field.
- Keep the user's original relative time wording; do NOT convert it into an absolute date. For example, "last summer" stays "last summer", not "summer 2025".
- Also add the time reference words to the keywords array, e.g. "last summer", "recently", "currently", "planning".

Output a single JSON object:
{
  "memories": [...],
  "entities": [{"name": "Alex", "aliases": [], "type": "person"}],
  "relations": [{"a": "Alex", "b": "Sam", "type": "friend"}]
}

Relation types: friend, partner, lover, fwb, date, affair, colleague, ex, sibling, knows, mentioned_with.
${identityHint}
${knownEntitiesHint}
Look for recurring themes across exchanges. If a memory overlaps heavily with existing traces, deprioritize or omit it.

${transcript}

Extract as a JSON object only:`;

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
          let extractedEntities: unknown[] = [];
          let extractedRelations: unknown[] = [];

          const arrayParsed = safeJsonParseArray(raw);
          if (arrayParsed) {
            memories = arrayParsed;
          } else {
            const objectParsed = safeJsonParse(raw);
            if (objectParsed) {
              memories = Array.isArray(objectParsed.memories) ? objectParsed.memories : [];
              extractedEntities = Array.isArray(objectParsed.entities) ? objectParsed.entities : [];
              extractedRelations = Array.isArray(objectParsed.relations) ? objectParsed.relations : [];
            } else {
              console.log("[darkroom:extract] failed to parse extraction JSON");
            }
          }

          console.log(
            `[darkroom:extract] batch=${totalBatches} session=${sessionId || "none"} raw_memories=${memories.length} entities=${extractedEntities.length} relations=${extractedRelations.length}`
          );

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
              let rawKeywords = Array.isArray(m.keywords)
                ? (m.keywords as unknown[])
                    .filter((k): k is string => typeof k === "string" && k.length > 0)
                    .map((k) => k.trim())
                : [];

              if (rawKeywords.length === 0) {
                rawKeywords = extractKeywords(trimmedContent);
              }

              const keywords = normalizeKeywords(rawKeywords);

              if (keywords.length === 0) {
                continue;
              }

              const memoryType =
                typeof m.memory_type === "string" &&
                ["user_fact", "system_inferred", "correction", "self_fact"].includes(m.memory_type)
                  ? (m.memory_type as "user_fact" | "system_inferred" | "correction" | "self_fact")
                  : /纠正|更正|否认|澄清|correction|deny|clarify/i.test(trimmedContent)
                  ? "correction"
                  : "user_fact";

              const scrubbedContent = scrubPii(trimmedContent);

              // Corrections should be stored as clean, separate memories rather than
              // merged into the false memory they contradict. Merging would dilute the
              // correction or resurrect the false claim.
              if (memoryType === "correction") {
                const memory = await storeMemory({
                  content: scrubbedContent,
                  keywords,
                  confidence,
                  source_lang: sourceLang,
                  memory_type: memoryType,
                  source_identity: identity,
                });
                batchStored.push(memory);
                continue;
              }

              // Deduplication check across all languages
              const similar = await findSimilarMemory(scrubbedContent, undefined, 0.65);
              if (similar) {
                // If the existing memory is a correction, do not overwrite it with a
                // potentially contradictory user_fact. Keep the correction authoritative.
                if (similar.memory_type === "correction") {
                  console.log(
                    `[darkroom:extract] skipping store: similar_to_correction=${similar.id} content="${scrubbedContent.slice(0, 40)}..."`
                  );
                  continue;
                }
                console.log(
                  `[darkroom:extract] merging memory similar_to=${similar.id} content="${scrubbedContent.slice(0, 40)}..."`
                );
                const merged = await mergeSimilarMemory(similar.id, {
                  content: scrubbedContent,
                  keywords,
                  confidence,
                  source_lang: sourceLang,
                  memory_type: memoryType,
                  source_identity: identity,
                });
                if (merged) {
                  batchStored.push(merged);
                }
                continue;
              }

              const memory = await storeMemory({
                content: scrubbedContent,
                keywords,
                confidence,
                source_lang: sourceLang,
                memory_type: memoryType,
                source_identity: identity,
              });
              batchStored.push(memory);
            }
          }

          // ── Process entities and relations extracted by the model ────────────
          try {
            await processExtractedEntitiesAndRelations({
              isZh,
              extractedEntities,
              extractedRelations,
              storedMemories: batchStored,
              identity,
            });
          } catch (err) {
            console.error("[darkroom:extract] entity/relation processing error:", err);
          }

          // Mark conversations as processed even if no new memories were stored
          // (otherwise they will loop forever)
          await markConversationsProcessed(batch.map((c) => c.id));
          totalProcessed += batch.length;
          totalStored += batchStored.length;
          storedMemories.push(...batchStored);

          console.log(
            `[darkroom:extract] batch=${totalBatches} session=${sessionId || "none"} stored=${batchStored.length} processed=${batch.length}`
          );
        }
      }
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
