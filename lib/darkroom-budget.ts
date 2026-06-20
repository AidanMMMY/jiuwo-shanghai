import { getEncoding } from "js-tiktoken";
import type { HistoryMessage } from "./darkroom-chat";

let encoder: ReturnType<typeof getEncoding> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = getEncoding("cl100k_base");
  }
  return encoder;
}

export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return getEncoder().encode(text, "all").length;
  } catch {
    // Fallback: rough byte-based estimate if tiktoken fails.
    return Math.ceil(new TextEncoder().encode(text).length / 2);
  }
}

export function truncateToTokens(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return "";
  const tokens = getEncoder().encode(text, "all");
  if (tokens.length <= maxTokens) return text;
  return getEncoder().decode(tokens.slice(0, maxTokens));
}

const MODEL_CONTEXT_LIMIT = 64000;
const RESPONSE_RESERVE_TOKENS = 2048;
const SAFETY_MARGIN_TOKENS = 1024;

export const MAX_INPUT_TOKENS =
  MODEL_CONTEXT_LIMIT - RESPONSE_RESERVE_TOKENS - SAFETY_MARGIN_TOKENS;

export interface ChatPromptComponents {
  knowledgeBase: string;
  systemPrompt: string;
  activeTimeContext: string;
  sessionBlock: string;
  memoryBlock: string;
  identityReminder: string;
  identityProbeInstruction?: string;
  entityCards?: string;
  topicReminder: string;
  topicLockInstruction: string;
  searchBlock: string;
  history: HistoryMessage[];
  userMessage: string;
}

function totalTokens(
  systemContent: string,
  history: HistoryMessage[],
  userMessage: string
): number {
  return (
    countTokens(systemContent) +
    history.reduce((sum, h) => sum + countTokens(h.content), 0) +
    countTokens(userMessage)
  );
}

function limitMemoryBlock(block: string, maxBulletCount: number, isZh: boolean): string {
  const footer = isZh ? "=== 结束 ===" : "=== END ===";
  const lines = block.split("\n");
  const bulletLines = lines.filter((l) => l.trim().startsWith("- "));
  if (bulletLines.length <= maxBulletCount) return block;
  const kept = bulletLines.slice(0, maxBulletCount);
  const headerEnd = lines.findIndex((l) => l.trim().startsWith("- "));
  const header = headerEnd >= 0 ? lines.slice(0, headerEnd).join("\n") : "";
  return [header, ...kept, footer].filter(Boolean).join("\n");
}

function stripIdentityNameMemories(identityReminder: string, isZh: boolean): string {
  const marker = isZh ? "=== 与这个名字相关的集体记忆 ===" : "=== Collective memory traces related to this name ===";
  const idx = identityReminder.indexOf(marker);
  return idx >= 0 ? identityReminder.slice(0, idx).trim() : identityReminder;
}

function truncateByParagraphs(text: string, maxTokens: number): string {
  const paragraphs = text.split("\n\n");
  let result = text;
  while (countTokens(result) > maxTokens && paragraphs.length > 1) {
    paragraphs.pop();
    result = paragraphs.join("\n\n");
  }
  if (countTokens(result) > maxTokens) {
    result = truncateToTokens(result, maxTokens);
  }
  return result;
}

/**
 * Build a chat input that fits within the model's context window.
 *
 * Reduction order (least important first):
 * 1. Drop web search block entirely.
 * 2. Reduce memory block to at most 3 bullet memories.
 * 3. Strip name-related memories from identity reminder.
 * 4. Shorten history (10 → 6 → 4 → 2).
 * 5. Truncate knowledgeBase tail by paragraphs.
 * 6. Truncate systemPrompt as a last resort.
 *
 * Topic reminder + lock instruction are always protected.
 */
export function buildChatPromptWithinBudget(
  components: ChatPromptComponents,
  isZh: boolean
): { systemContent: string; history: HistoryMessage[]; dropped: string[] } {
  const {
    knowledgeBase,
    systemPrompt,
    activeTimeContext,
    sessionBlock,
    memoryBlock,
    identityReminder,
    identityProbeInstruction,
    entityCards,
    topicReminder,
    topicLockInstruction,
    searchBlock,
    history,
    userMessage,
  } = components;

  const dropped: string[] = [];
  let currentMemoryBlock = memoryBlock;
  let currentIdentityReminder = identityReminder;
  const currentIdentityProbe = identityProbeInstruction ?? '';
  let currentEntityCards = entityCards ?? '';
  let currentHistory = history;
  let currentSearchBlock = searchBlock;
  let currentKnowledgeBase = knowledgeBase;

  const buildSystemContent = () =>
    [
      currentKnowledgeBase,
      systemPrompt,
      activeTimeContext,
      sessionBlock,
      currentMemoryBlock,
      currentIdentityReminder,
      currentIdentityProbe,
      currentEntityCards,
      topicReminder,
      topicLockInstruction,
      currentSearchBlock,
    ]
      .filter(Boolean)
      .join("\n\n");

  let systemContent = buildSystemContent();

  const reduce = () => {
    systemContent = buildSystemContent();
    return totalTokens(systemContent, currentHistory, userMessage);
  };

  if (reduce() <= MAX_INPUT_TOKENS) {
    return { systemContent, history: currentHistory, dropped };
  }

  // 1. Drop search block.
  if (currentSearchBlock) {
    currentSearchBlock = "";
    dropped.push("search");
    if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
  }

  // 2. Reduce memory block to 3 bullets.
  if (currentMemoryBlock) {
    const reduced = limitMemoryBlock(currentMemoryBlock, 3, isZh);
    if (reduced !== currentMemoryBlock) {
      currentMemoryBlock = reduced;
      dropped.push("memory-extra");
      if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
    }
  }

  // 3. Drop entity cards if still over budget (memory block was already reduced).
  if (currentEntityCards) {
    currentEntityCards = "";
    dropped.push("entity-cards");
    if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
  }

  // 4. Strip name memories from identity reminder.
  if (currentIdentityReminder) {
    const reduced = stripIdentityNameMemories(currentIdentityReminder, isZh);
    if (reduced !== currentIdentityReminder) {
      currentIdentityReminder = reduced;
      dropped.push("identity-name-memories");
      if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
    }
  }

  // 5. Shorten history.
  const historyLimits = [6, 4, 2];
  for (const limit of historyLimits) {
    if (currentHistory.length > limit) {
      currentHistory = currentHistory.slice(-limit);
      dropped.push(`history-${limit}`);
      if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
    }
  }

  // 6. Truncate knowledgeBase tail by paragraphs.
  const protectedTokens =
    countTokens(systemPrompt) +
    countTokens(activeTimeContext) +
    countTokens(sessionBlock) +
    countTokens(currentMemoryBlock) +
    countTokens(currentIdentityReminder) +
    countTokens(currentIdentityProbe) +
    countTokens(currentEntityCards) +
    countTokens(topicReminder) +
    countTokens(topicLockInstruction) +
    countTokens(userMessage) +
    currentHistory.reduce((sum, h) => sum + countTokens(h.content), 0) +
    SAFETY_MARGIN_TOKENS;
  const kbBudget = Math.max(0, MAX_INPUT_TOKENS - protectedTokens);
  if (countTokens(currentKnowledgeBase) > kbBudget) {
    currentKnowledgeBase = truncateByParagraphs(currentKnowledgeBase, kbBudget);
    dropped.push("knowledgeBase-tail");
    if (reduce() <= MAX_INPUT_TOKENS) return { systemContent, history: currentHistory, dropped };
  }

  // 6. Last resort: truncate the whole system prompt to fit.
  const hardMax =
    MAX_INPUT_TOKENS -
    currentHistory.reduce((sum, h) => sum + countTokens(h.content), 0) -
    countTokens(userMessage);
  systemContent = truncateToTokens(systemContent, Math.max(0, hardMax));
  dropped.push("system-truncate");

  return { systemContent, history: currentHistory, dropped };
}
