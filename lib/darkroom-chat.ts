import { deepseekClient, DEFAULT_MODEL } from "./deepseek/client";
import { KNOWN_ENTITIES, matchKnownEntity } from "./darkroom";
import { DynamicEntity, getRecentConversationsBySession, getSessionState, upsertSessionState } from "./darkroom-memory";

export interface HistoryMessage {
  role: string;
  content: string;
}

export type UserIntent = "answer" | "ask" | "shift" | "gossip";

export interface TopicState {
  /** 当前锁定的人名/主题实体 */
  primaryEntity?: string;
  /** primaryEntity 是否是用户主动提到的（而非系统自己提到的） */
  primaryIsUserMentioned: boolean;
  /** 最近出现的实体列表，按优先级排序 */
  entities: string[];
  /** 对用户最新一条消息的意图判断 */
  userIntent: UserIntent;
  /** 如果上一条是 assistant 的提问，这里记录它围绕的实体 */
  lastAssistantQuestionTopic?: string;
}

const NAME_STOPWORDS_ZH = new Set([
  "我",
  "你",
  "他",
  "她",
  "它",
  "这",
  "那",
  "的",
  "了",
  "是",
  "不是",
  "一个",
  "有人",
  "没人",
]);

const NAME_STOPWORDS_EN = new Set([
  "i",
  "you",
  "he",
  "she",
  "it",
  "this",
  "that",
  "me",
  "my",
  "mine",
  "someone",
  "nobody",
]);

const ZH_PRONOUNS = /他|她|ta|这个|那个|那人|这位|那位/;
const EN_PRONOUNS =
  /\b(he|she|they|him|her|them|this person|that person|this guy|that guy)\b/i;

const ZH_SHIFT_MARKERS = /先不说|换个话题|聊聊别的|转回|回到|至于|对了|聊点别的/;
const EN_SHIFT_MARKERS =
  /\b(let's talk about|switching to|by the way|anyway|moving on|back to|changing subject)\b/i;

const GENERIC_TOPIC_DENYLIST_ZH = new Set([
  "他", "她", "ta", "它", "这个", "那个", "这位", "那位", "这人", "那人",
  "某个人", "某人", "有人", "没人", "任何人", "谁", "什么", "哪个",
]);

const GENERIC_TOPIC_DENYLIST_EN = new Set([
  "he", "she", "they", "him", "her", "them", "it", "this", "that",
  "this person", "that person", "this guy", "that guy", "someone",
  "somebody", "anyone", "anybody", "nobody", "no one", "who", "what",
  "which", "person",
]);

export function containsPronoun(text: string, isZh: boolean): boolean {
  if (!text) return false;
  if (isZh) return ZH_PRONOUNS.test(text);
  return EN_PRONOUNS.test(text);
}

function isConcreteTopicEntity(name: string, isZh: boolean): boolean {
  const key = name.trim().toLowerCase();
  if (key.length < 2) return false;
  const denylist = isZh ? GENERIC_TOPIC_DENYLIST_ZH : GENERIC_TOPIC_DENYLIST_EN;
  return !denylist.has(key);
}

export function isConcreteTopicEntityForTest(name: string, isZh: boolean): boolean {
  return isConcreteTopicEntity(name, isZh);
}

export function looksLikeName(text: string, isZh: boolean): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isZh) {
    if (/[，。！？；]/.test(trimmed)) return false;
    if (trimmed.length > 8) return false;
    if (NAME_STOPWORDS_ZH.has(trimmed)) return false;
    return true;
  }
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 3) return false;
  if (/[.,!?;:]/.test(trimmed)) return false;
  if (NAME_STOPWORDS_EN.has(words[0].toLowerCase())) return false;
  return /^[A-Za-z0-9_\-]+$/.test(words[0]);
}

export function isQuestion(text: string, isZh: boolean): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/[?？]$/.test(trimmed)) return true;
  if (isZh) {
    return /[?？]|吗|么|呢|什么|谁|哪|怎么|为什么|多少|几/.test(trimmed);
  }
  return /^\s*(what|who|where|when|why|how|which|is|are|do|does|did|can|could|would|will|shall|should|have|has|had)\b/i.test(
    trimmed
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractUserMentionedNames(
  history: HistoryMessage[],
  isZh: boolean
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  const patterns = isZh
    ? [
        /(?:你|我|系统)?(?:认识|知道|了解|听过|见过)(.+?)(?:吗|么|？|\?|$)/,
        /(.+?)(?:是|叫)(?:谁|哪位)/,
      ]
    : [
        /(?:do you know|have you met|have you heard of|tell me about)\s+(.+?)(?:\?|\.|!|$)/i,
        /who is\s+(.+?)(?:\?|\.|!|$)/i,
        /what about\s+(.+?)(?:\?|\.|!|$)/i,
      ];

  // Scan last 6 user messages, most recent first
  for (let i = history.length - 1; i >= 0 && i >= history.length - 6; i--) {
    const msg = history[i];
    if (msg.role !== "user" || !msg.content) continue;

    const text = msg.content.trim();
    let matched: RegExpMatchArray | null = null;
    for (const p of patterns) {
      matched = text.match(p);
      if (matched && matched[1]) break;
    }

    if (matched && matched[1]) {
      const raw = matched[1].trim();
      const cleaned = raw
        .replace(/[，。！？、；：\.\,\!\?\;\:]/g, "")
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 20) {
        const key = cleaned.toLowerCase();
        if (!seen.has(key)) {
          names.push(cleaned);
          seen.add(key);
        }
      }
    }
  }

  return names;
}

export function classifyUserIntent(
  message: string,
  previousAssistant: string | undefined,
  isZh: boolean
): UserIntent {
  const trimmed = message.trim();
  if (!trimmed) return "gossip";

  // Explicit topic shift markers take precedence
  if (isZh) {
    if (ZH_SHIFT_MARKERS.test(trimmed)) return "shift";
  } else {
    if (EN_SHIFT_MARKERS.test(trimmed)) return "shift";
  }

  // Detect short answers to the assistant's previous question
  const prevIsQuestion = previousAssistant
    ? isQuestion(previousAssistant, isZh)
    : false;

  if (prevIsQuestion) {
    if (isZh) {
      if (trimmed.length < 12) return "answer";
      if (
        /^(是|不是|对|不对|嗯|算了|没有|没|是的|不是啊|对呀|不对啊|大概|也许|可能)/.test(
          trimmed
        )
      )
        return "answer";
    } else {
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount < 6) return "answer";
      if (
        /^(yes|no|yep|nope|yeah|nah|not really|forget it|maybe|sort of|i don't|i do|sure|okay|ok|probably|perhaps)\b/i.test(
          trimmed
        )
      )
        return "answer";
    }
  }

  // Detect questions
  if (isQuestion(trimmed, isZh)) return "ask";

  return "gossip";
}

/**
 * Build a topic state from recent conversation history.
 * The primary entity is chosen by priority:
 * 1. Names the user explicitly asked about (even if not in KNOWN_ENTITIES)
 * 2. Known entities mentioned in the last 10 messages
 */
export interface ClassifierResult {
  intent: UserIntent;
  topicEntity?: string;
  confidence: number;
}

const VALID_INTENTS = new Set<UserIntent>(["answer", "ask", "shift", "gossip"]);

export async function classifyMessageWithModel(
  message: string,
  history: HistoryMessage[],
  isZh: boolean
): Promise<ClassifierResult | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "dummy-key-for-build") return null;

  const recent = history.slice(-6);
  const transcript = recent
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");

  const system = isZh
    ? `你是一个对话意图分类器。只输出 JSON，不要解释。
根据最近对话和用户的最新消息，判断：
- intent: "answer"（用户在回答 assistant 刚问的问题） / "ask"（用户在提问） / "shift"（用户明确想换话题） / "gossip"（闲聊延续）
- topicEntity: 用户正在聊的具体人名或主题。如果用户用了指代（他/她/ta/这个/那个），必须把它对应到对话历史里最近出现过的具体人名；不要填泛指（某个人/有人/他）。如果最新消息里有指代，topicEntity 应该是该指代指向的人，而不是句子里出现的其他名字（例如「他喜欢 Aidan」里，topicEntity 是「他」指的人，不是 Aidan）。没有具体对象则填 null。
- confidence: 0-1
输出格式：{"intent":"...","topicEntity":"...","confidence":0.x}`
    : `You are a conversation intent classifier. Output ONLY JSON, no explanation.
Given the recent conversation and the user's latest message, classify:
- intent: "answer" (user answers assistant's previous question) / "ask" (user asks a question) / "shift" (user clearly changes topic) / "gossip" (casual continuation)
- topicEntity: the specific person or topic the user is talking about. If the user uses a pronoun (he/she/they/this/that), you MUST resolve it to the most recently mentioned concrete person in the conversation; do NOT use generic placeholders like "someone" or "that person". If the latest message contains a pronoun, topicEntity should be the person the pronoun refers to, not another name in the sentence (e.g. in "Does he like Aidan?", topicEntity is who "he" refers to, not Aidan). Use null if there is no concrete object.
- confidence: 0-1
Format: {"intent":"...","topicEntity":"...","confidence":0.x}`;

  try {
    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        ...(transcript ? [{ role: "user" as const, content: transcript }] : []),
        { role: "user", content: `Latest user message: ${message}` },
      ],
      temperature: 0.1,
      max_tokens: 120,
    });
    const raw = completion.choices[0]?.message?.content || "";
    console.log("[darkroom:chat] classifier raw:", JSON.stringify(raw));

    if (!raw.trim()) {
      console.log("[darkroom:chat] classifier returned empty content");
      return null;
    }

    let cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim();
    // Sometimes the model wraps the JSON in quotes or adds trailing text.
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Last resort: try the original raw string in case markdown was not present.
      parsed = JSON.parse(raw.trim());
    }

    const intent = VALID_INTENTS.has(parsed.intent as UserIntent) ? (parsed.intent as UserIntent) : "gossip";
    let topicEntity =
      typeof parsed.topicEntity === "string" && parsed.topicEntity.trim().length >= 2
        ? parsed.topicEntity.trim()
        : undefined;
    if (topicEntity && !isConcreteTopicEntity(topicEntity, isZh)) {
      topicEntity = undefined;
    }
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
    return { intent, topicEntity, confidence };
  } catch (err) {
    console.error("[darkroom:chat] classifier failed:", err);
    return null;
  }
}

function toKnownEntity(entity: DynamicEntity) {
  return {
    name: entity.name,
    aliases: entity.aliases,
    enHint: "",
    zhHint: "",
  };
}

/**
 * Build a topic state from recent conversation history.
 * The primary entity is chosen by priority:
 * 1. Session-level anchor (primary_entity persisted in darkroom_sessions)
 * 2. Model classifier topicEntity when it does not conflict with the session anchor
 * 3. Names the user explicitly asked about (even if not in KNOWN_ENTITIES)
 * 4. Known/dynamic entities mentioned in user messages, then assistant messages
 */
export function buildTopicState(
  history: HistoryMessage[],
  isZh: boolean,
  dynamicEntities: DynamicEntity[] = [],
  classifier?: ClassifierResult | null,
  sessionPrimaryEntity?: string
): TopicState {
  const allEntities = [...KNOWN_ENTITIES, ...dynamicEntities.map(toKnownEntity)];
  const entities: string[] = [];
  const seen = new Set<string>();

  function addEntity(name: string) {
    const key = name.toLowerCase();
    if (key.length < 2 || seen.has(key)) return;
    entities.push(name);
    seen.add(key);
  }

  function findCanonical(name: string): string {
    const key = name.toLowerCase();
    for (const entity of allEntities) {
      if (entity.name.toLowerCase() === key) return entity.name;
      for (const alias of entity.aliases) {
        if (alias.toLowerCase() === key) return entity.name;
      }
    }
    return name;
  }

  function setPrimaryEntity(name: string) {
    const canonical = findCanonical(name);
    const key = canonical.toLowerCase();
    const idx = entities.findIndex((e) => e.toLowerCase() === key);
    if (idx >= 0) entities.splice(idx, 1);
    entities.unshift(canonical);
    seen.add(key);
  }

  function appearsInMessages(name: string, messages: HistoryMessage[]): boolean {
    const canonical = findCanonical(name);
    const entity = matchKnownEntity(canonical);
    const names = [name, canonical, ...(entity?.aliases || [])];
    const unique = new Set(names.filter((n) => n.length >= 2));
    for (const msg of messages) {
      if (!msg.content) continue;
      for (const n of unique) {
        const found = isZh
          ? msg.content.includes(n)
          : new RegExp(`\\b${escapeRegex(n)}\\b`, "i").test(msg.content);
        if (found) return true;
      }
    }
    return false;
  }

  function findRecentTopicInMessages(
    messages: HistoryMessage[],
    candidate?: string
  ): string | null {
    if (candidate) {
      for (const role of ["user", "assistant"] as const) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.role !== role || !msg.content) continue;
          if (appearsInMessages(candidate, [msg])) {
            return findCanonical(candidate);
          }
        }
      }
    }
    for (const role of ["user", "assistant"] as const) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== role || !msg.content) continue;
        for (const entity of allEntities) {
          const names = [entity.name, ...entity.aliases];
          for (const name of names) {
            if (name.length < 2) continue;
            const found = isZh
              ? msg.content.includes(name)
              : new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(msg.content);
            if (found) return entity.name;
          }
        }
      }
    }
    return null;
  }

  const lastUserMsg = history[history.length - 1];
  const priorMessages = history.slice(0, -1).slice(-10);
  const recentMessages = history.slice(-10);

  // 1. Inherit the most recent entity when the latest user message uses a
  //    pronoun. We look at prior messages for a concrete reference, preferring
  //    user messages over assistant messages. The classifier topicEntity is used
  //    first because it can resolve memory-out names (like "nemo") that are not
  //    in KNOWN_ENTITIES or the dynamic entity table.
  if (
    lastUserMsg &&
    lastUserMsg.role === "user" &&
    containsPronoun(lastUserMsg.content, isZh)
  ) {
    let inherited: string | null = null;

    if (classifier?.topicEntity && isConcreteTopicEntity(classifier.topicEntity, isZh)) {
      inherited = findRecentTopicInMessages(priorMessages, classifier.topicEntity);
    }

    if (!inherited && sessionPrimaryEntity) {
      inherited = findRecentTopicInMessages(priorMessages, sessionPrimaryEntity);
    }

    if (!inherited) {
      inherited = findRecentTopicInMessages(priorMessages);
    }

    if (!inherited && sessionPrimaryEntity) {
      inherited = findCanonical(sessionPrimaryEntity);
    }

    if (inherited) addEntity(inherited);
  }

  // 2. Names the user explicitly asked about (even if not in KNOWN_ENTITIES)
  const userMentioned = extractUserMentionedNames(history, isZh);
  for (const name of userMentioned) {
    addEntity(findCanonical(name));
  }

  // 3. Known/dynamic entities from user messages, then assistant messages.
  //    If the latest message was a pronoun, we already inherited a topic above,
  //    so we skip re-scanning user messages to avoid an object name (e.g. Aidan)
  //    from becoming primary.
  for (const role of ["user", "assistant"] as const) {
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      if (msg.role !== role || !msg.content) continue;
      if (msg.role === "user" && entities[0]) continue;

      for (const entity of allEntities) {
        if (seen.has(entity.name.toLowerCase())) continue;
        const names = [entity.name, ...entity.aliases];
        for (const name of names) {
          if (name.length < 2) continue;
          const found = isZh
            ? msg.content.includes(name)
            : new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(msg.content);
          if (found) {
            entities.push(entity.name);
            seen.add(entity.name.toLowerCase());
            break;
          }
        }
      }
    }
  }

  // 4. Session anchor: only use as a fallback if the current history gives us
  //    no topic object. This prevents a stale session topic from overriding a
  //    name the user is currently asking about.
  if (!entities[0] && sessionPrimaryEntity) {
    addEntity(findCanonical(sessionPrimaryEntity));
  }

  // 5. Classifier: an explicit, confident shift can override the current topic;
  //    otherwise use the classifier topicEntity as a fallback when it is concrete
  //    and actually appears in the recent conversation.
  if (classifier?.topicEntity && isConcreteTopicEntity(classifier.topicEntity, isZh)) {
    const canonical = findCanonical(classifier.topicEntity);
    if (classifier.intent === "shift" && classifier.confidence >= 0.7) {
      setPrimaryEntity(canonical);
    } else if (!entities[0] && appearsInMessages(classifier.topicEntity, recentMessages)) {
      addEntity(canonical);
    }
  }

  const primaryEntity = entities[0];
  const primaryIsUserMentioned = primaryEntity
    ? userMentioned.some((n) => n.toLowerCase() === primaryEntity.toLowerCase())
    : false;

  const previousAssistant =
    history.length >= 2 && history[history.length - 2].role === "assistant"
      ? history[history.length - 2].content
      : undefined;

  const ruleIntent =
    lastUserMsg && lastUserMsg.role === "user"
      ? classifyUserIntent(lastUserMsg.content, previousAssistant, isZh)
      : "gossip";

  // Prefer classifier intent only when it is confident enough; otherwise fall
  // back to the rule-based intent derived from the current message.
  const userIntent =
    classifier && classifier.confidence >= 0.75
      ? classifier.intent
      : ruleIntent;

  const lastAssistantQuestionTopic =
    previousAssistant && isQuestion(previousAssistant, isZh)
      ? primaryEntity
      : undefined;

  return {
    primaryEntity,
    primaryIsUserMentioned,
    entities,
    userIntent,
    lastAssistantQuestionTopic,
  };
}

export function resolvePronouns(
  message: string,
  topicState: TopicState,
  isZh: boolean
): string | null {
  const { primaryEntity, userIntent } = topicState;
  if (!primaryEntity) return null;

  const lowerMsg = message.toLowerCase();
  const names = [primaryEntity.toLowerCase()];
  const entity = matchKnownEntity(primaryEntity);
  if (entity) {
    names.push(...entity.aliases.map((a) => a.toLowerCase()));
  }

  // If the message already names the entity explicitly, no rewrite needed
  for (const name of names) {
    if (name.length >= 2 && lowerMsg.includes(name)) return null;
  }

  const isShort = isZh
    ? message.trim().length < 12
    : message.trim().split(/\s+/).length < 6;

  const hasPronoun = containsPronoun(message, isZh);

  if (hasPronoun || isShort || userIntent === "answer") {
    if (isZh) {
      if (userIntent === "answer") {
        return `（接上一条关于${primaryEntity}的问题）${message}`;
      }
      return `关于刚才聊的「${primaryEntity}」：${message}`;
    }
    if (userIntent === "answer") {
      return `(Continuing the question about ${primaryEntity}): ${message}`;
    }
    return `Regarding ${primaryEntity} we were just discussing: ${message}`;
  }

  return null;
}

export function buildTopicReminder(
  topicState: TopicState,
  isZh: boolean
): string {
  const { primaryEntity, userIntent } = topicState;
  if (!primaryEntity) return "";

  if (isZh) {
    let reminder = `[当前话题对象锁定为：${primaryEntity}。用户这条消息里的「他」「她」「ta」「这个」「那个」「那位」等指代，默认就是指 ${primaryEntity}。不要反问「指谁」「哪位」，不要请求用户重新锁定坐标，不要以指代模糊为由回避或要求澄清。直接回答。]`;
    if (userIntent === "answer") {
      reminder += `\n[用户这条消息是在回答你上一句关于 ${primaryEntity} 的问题。请先明确承认/回应用户的回答，再顺着问。]`;
    } else if (userIntent === "ask") {
      reminder += `\n[用户在问关于 ${primaryEntity} 的问题。直接回答，不要换人物。]`;
    }
    return reminder;
  }

  let reminder = `[Current topic locked on: ${primaryEntity}. Pronouns like "he", "she", "they", "this person", "that person" in the user's message refer to ${primaryEntity} by default. Do not ask who they mean, do not ask to re-lock coordinates, and do not use ambiguous pronouns as an excuse to deflect or request clarification. Answer directly.]`;
  if (userIntent === "answer") {
    reminder += `\n[The user is answering your previous question about ${primaryEntity}. Acknowledge their answer first, then continue.]`;
  } else if (userIntent === "ask") {
    reminder += `\n[The user is asking about ${primaryEntity}. Answer directly and do not switch persons.]`;
  }
  return reminder;
}

/**
 * Helper to detect if a message looks like an explicit name introduction.
 * Keep here so the name extraction logic is centralized and testable.
 */
export function extractExplicitName(
  text: string,
  isZh: boolean
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (isZh) {
    const patterns = [
      /(?:我叫|我是|我就是|称呼我(?:为)?|叫我)([^，。！？\s]{1,20})(?=[，。！？\s]|$)/i,
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m && m[1] && !NAME_STOPWORDS_ZH.has(m[1])) return m[1];
    }
  } else {
    const patterns = [
      /\bi am\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bi'm\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bmy name is\s+(.{1,30})(?=\.|,|!|\?|$)/i,
      /\bcall me\s+(.{1,30})(?=\.|,|!|\?|$)/i,
    ];
    for (const p of patterns) {
      const m = trimmed.match(p);
      if (m && m[1]) {
        const name = m[1].trim().split(/\s+/)[0];
        if (name && !NAME_STOPWORDS_EN.has(name.toLowerCase())) return name;
      }
    }
  }
  return null;
}

export function isNameQuestion(text: string, isZh: boolean): boolean {
  const lower = text.toLowerCase();
  if (isZh) {
    return /称呼|名字|叫什么|怎么称呼|你是谁|怎么叫你/.test(text);
  }
  return /\bname\b|\bcall you\b|\bwho are you\b|\bwhat should i call you\b/i.test(
    lower
  );
}

/**
 * Extract the user's name from history by looking for explicit introductions
 * or short replies right after the assistant asked for a name.
 */
export function extractUserNameFromHistory(
  history: HistoryMessage[],
  isZh: boolean
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== "user") continue;

    const explicit = extractExplicitName(msg.content, isZh);
    if (explicit) return explicit;

    const prev = history[i - 1];
    if (prev && prev.role === "assistant" && isNameQuestion(prev.content, isZh)) {
      if (looksLikeName(msg.content, isZh)) return msg.content.trim();
    }
  }
  return null;
}

// ── TopicLock output parsing ───────────────────────────────────────────

const TOPIC_LOCK_RE = /^\[TopicLock:\s*(.+?)\s*\]\s*\n?/;

export function parseTopicLock(content: string): { topic?: string; cleanContent: string } {
  const match = content.match(TOPIC_LOCK_RE);
  if (!match) return { cleanContent: content.trimStart() };
  const cleanContent = content.slice(match[0].length).trimStart();
  return { topic: match[1].trim(), cleanContent };
}

export function formatTopicLockInstruction(topic: string, isZh: boolean): string {
  if (isZh) {
    return `在写最终回复前，先输出一行固定格式：[TopicLock: ${topic}]。然后空一行再写回复。如果当前没有具体对象，写 [TopicLock: none]。这行只用于内部校验，不要让它出现在用户看到的回复里——回复正文必须紧跟在标签之后。`;
  }
  return `Before your final reply, output exactly one line: [TopicLock: ${topic}]. Then write your reply. If there is no specific topic/person, write [TopicLock: none]. This tag is for internal verification only; the actual reply must follow it.`;
}

// ── Session rolling summary ────────────────────────────────────────────

export async function updateSessionSummary(
  sessionId: string,
  latestUser: string,
  latestAssistant: string,
  isZh: boolean
): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "dummy-key-for-build") return;

  try {
    const recent = await getRecentConversationsBySession(sessionId, 8);
    const currentState = await getSessionState(sessionId).catch(() => null);
    const previousSummary = currentState?.summary || "";

    const transcript = recent
      .map(
        (c, i) =>
          `${i + 1}. User: ${c.user_message}\n   Assistant: ${c.assistant_response}`
      )
      .join("\n\n");

    const system = isZh
      ? `你是 JIUWO Darkroom 会话摘要器。根据最近对话和已有的滚动摘要，生成新的简短摘要。要求：
- 1-2 句话，说明当前主要话题对象和关键事实
- 如果话题已经转移，摘要要反映新话题
- 输出严格 JSON：{"summary":"...","primary_entity":"...","last_user_intent":"answer|ask|shift|gossip"}`
      : `You are a JIUWO Darkroom session summarizer. Given recent exchanges and an existing rolling summary, produce a new brief summary.
- 1-2 sentences covering the current main topic/person and key facts
- If the topic has shifted, reflect the new topic
- Output strict JSON: {"summary":"...","primary_entity":"...","last_user_intent":"answer|ask|shift|gossip"}`;

    const userPrompt = isZh
      ? `已有摘要：${previousSummary || "无"}\n\n最近对话：\n${transcript}\n\n请生成新的 JSON 摘要。`
      : `Previous summary: ${previousSummary || "none"}\n\nRecent exchanges:\n${transcript}\n\nGenerate the new JSON summary.`;

    const completion = await deepseekClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed.summary === "string" && parsed.summary.trim()) {
      await upsertSessionState(sessionId, {
        summary: parsed.summary.trim(),
        primary_entity:
          typeof parsed.primary_entity === "string" &&
          parsed.primary_entity.trim().length >= 2
            ? parsed.primary_entity.trim()
            : undefined,
        last_user_intent: VALID_INTENTS.has(parsed.last_user_intent)
          ? parsed.last_user_intent
          : undefined,
      });
    }
  } catch (err) {
    console.error("[darkroom:chat] updateSessionSummary failed:", err);
  }
}
