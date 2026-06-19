import { deepseekClient, DEFAULT_MODEL } from "./deepseek/client";
import { safeJsonParse as _safeJsonParse } from "./darkroom-chat";

export { _safeJsonParse as safeJsonParse };

const FALLBACK_NAMES = [
  "Aidan",
  "老王",
  "小夏",
  "Leo",
  "阿杰",
  "Mina",
  "东东",
  "Evan",
];

export interface StoryRelayResponse {
  storyZh: string;
  storyEn: string;
  questionZh: string;
  questionEn: string;
  suggestion1Zh: string;
  suggestion1En: string;
  suggestion2Zh: string;
  suggestion2En: string;
}

export const OPENING_PROMPT = `你是 JIUWO（啾喔）酒吧的驻场 storyteller。JIUWO 是上海巨鹿路 397 号一家 gay bar，客群以男同性恋为主，氛围像"朋友的客厅"。请用以下人名：{names}，围绕酒吧写一段 300-500 字的开头。
要求：
1. 场景在上海巨鹿路 397 号的 JIUWO 酒吧，剧情要有 gay 向氛围和社群感。
2. 人物性格贱兮兮、俏皮、毒舌又温柔，对话和互动要有戏。
3. 故事要分段，每段 2-3 句话，段落之间用换行符（\\n）分隔，增强可读性。
4. 性别代词注意：Mavis、摄影、梦子用"她"，其他角色用"他"。英文里 Mavis, Sheying, Mengzi 用 she/her，其他用 he/him。
5. 结尾提出一个开放性问题。
6. 给出两个建议方向。
7. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
8. 中英文都要自然、有文学感，不要直译。
9. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。`;

export const CONTINUE_PROMPT = `你是 JIUWO（啾喔）酒吧的驻场 storyteller。JIUWO 是上海巨鹿路 397 号一家 gay bar，客群以男同性恋为主，氛围像"朋友的客厅"。
请用以下人名作为故事角色：{names}
当前故事已有 {n} 段。上一段结尾的问题是：{latestQuestion}
用户的回答是：{userInput}
用户的名字是：{userName}。如果合适，可以以微妙、自然的方式将这个名字融入剧情（例如作为一个新推门而入的客人、一个被提及的旧友、或一个暗示性的旁白视角），但不要强行插入，也不要破坏叙事节奏。
要求：
1. 续写 300-500 字，保持酒吧场景、gay 向氛围和社群感。
2. 人物性格贱兮兮、俏皮、毒舌又温柔，对话和互动要有戏。
3. 故事要分段，每段 2-3 句话，段落之间用换行符（\\n）分隔，增强可读性。
4. 性别代词注意：Mavis、摄影、梦子用"她"，其他角色用"他"。英文里 Mavis, Sheying, Mengzi 用 she/her，其他用 he/him。
5. 结尾提出一个开放性问题，推动剧情。
6. 同时给出两个简短的剧情建议方向（A / B）。
7. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
8. 中英文都要自然、有文学感，不要直译。
9. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。`;

const OUTPUT_SCHEMA = `{ "storyZh": "...", "storyEn": "...", "questionZh": "...", "questionEn": "...", "suggestion1Zh": "...", "suggestion1En": "...", "suggestion2Zh": "...", "suggestion2En": "..." }`;

export function buildOpeningPrompt(names: string[]): string {
  return OPENING_PROMPT.replace("{names}", names.join("、"));
}

export function buildContinuePrompt(
  names: string[],
  n: number,
  latestQuestion: string,
  userInput: string,
  userName: string
): string {
  return CONTINUE_PROMPT
    .replace("{names}", names.join("、"))
    .replace("{n}", String(n))
    .replace("{latestQuestion}", latestQuestion)
    .replace("{userInput}", userInput)
    .replace("{userName}", userName);
}

export function parseStoryRelayResponse(raw: string): StoryRelayResponse | null {
  const parsed = _safeJsonParse(raw);
  if (!parsed) return null;
  const keys: (keyof StoryRelayResponse)[] = [
    "storyZh", "storyEn", "questionZh", "questionEn",
    "suggestion1Zh", "suggestion1En", "suggestion2Zh", "suggestion2En",
  ];
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value !== "string" || value.trim().length === 0) return null;
  }
  return parsed as unknown as StoryRelayResponse;
}

export function isContentAllowed(storyZh: string, storyEn: string): { allowed: boolean; reason?: string } {
  const forbiddenZh = ["强奸", "猥亵", "性侵", "未成年人", "儿童"];
  const forbiddenEn = ["rape", "molest", "minor", "child", "underage"];
  const combined = (storyZh + " " + storyEn).toLowerCase();
  for (const word of forbiddenZh) {
    if (combined.includes(word)) return { allowed: false, reason: "包含不允许的敏感内容" };
  }
  for (const word of forbiddenEn) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(combined)) return { allowed: false, reason: "包含不允许的敏感内容" };
  }
  return { allowed: true };
}

interface MemoryLike {
  content: string;
  confidence: number;
}

const COMMON_ZH_SURNAMES = new Set([
  "李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林",
  "何", "郭", "马", "罗", "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧", "程", "曹",
  "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕", "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛",
  "叶", "阎", "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜", "范", "方", "石", "姚",
  "谭", "廖", "邹", "熊", "金", "陆", "郝", "孔", "白", "崔", "康", "毛", "邱", "秦", "江", "史",
  "顾", "侯", "邵", "孟", "龙", "万", "段", "雷", "钱", "汤", "尹", "黎", "易", "常", "武", "乔",
  "贺", "赖", "龚", "文", "小", "老", "阿",
]);

const EN_NAME_STOPWORDS = new Set([
  "The", "A", "An", "Is", "Are", "Was", "Were", "Be", "Been", "Being", "Have", "Has", "Had", "Do", "Does", "Did",
  "Will", "Would", "Could", "Should", "May", "Might", "Must", "Shall", "Can", "Need", "Used", "To", "Of", "In",
  "For", "On", "With", "At", "By", "From", "As", "Into", "Through", "During", "Before", "After", "Above", "Below",
  "Between", "Under", "Again", "Further", "Then", "Once", "Here", "There", "When", "Where", "Why", "How", "All",
  "Any", "Both", "Each", "Few", "More", "Most", "Other", "Some", "Such", "No", "Nor", "Not", "Only", "Own", "Same",
  "So", "Than", "Too", "Very", "Just", "And", "But", "If", "Or", "Because", "Until", "While", "This", "That",
  "These", "Those", "I", "Me", "My", "Myself", "We", "Our", "Ours", "Ourselves", "You", "Your", "Yours", "Yourself",
  "Yourselves", "He", "Him", "His", "Himself", "She", "Her", "Hers", "Herself", "It", "Its", "Itself", "They",
  "Them", "Their", "Theirs", "Themselves", "What", "Which", "Who", "Whom", "Whose", "Am", "Ji", "Jiu", "Wo",
]);

const ZH_NAME_STOPWORDS = new Set([
  "的", "了", "是", "和", "在", "有", "被", "把", "给", "让", "对", "向", "从", "到", "为", "与", "或", "但", "而", "因", "于", "以", "所", "就", "都", "也", "还", "很", "更", "最", "太", "只", "才", "又", "再", "便", "即", "若", "虽", "则", "乃", "既", "且", "并", "况", "岂", "非", "毋", "勿", "别", "不", "没", "无", "未", "莫", "甭", "来", "去", "过", "着", "得", "地", "吧", "呢", "啊", "哦", "嗯", "唉", "哟", "嘛", "吗", "哈", "常", "喝", "酒", "喜", "欢", "坐", "今", "天", "气", "不", "错",
]);

function isLikelyZhName(name: string): boolean {
  if (name.length < 2 || name.length > 4) return false;
  if (!COMMON_ZH_SURNAMES.has(name[0])) return false;
  for (const ch of name) {
    if (ZH_NAME_STOPWORDS.has(ch)) return false;
  }
  return true;
}

export function extractNamesFromMemories(memories: MemoryLike[], fallbackNames: string[] = FALLBACK_NAMES): string[] {
  const candidates = new Map<string, number>();

  for (const m of memories) {
    // Extract Chinese names by sliding window of 2-3 characters
    const content = m.content;
    for (let i = 0; i < content.length; i++) {
      if (!/[一-龥]/.test(content[i])) continue;
      // Try 2-character name
      if (i + 1 < content.length && /[一-龥]/.test(content[i + 1])) {
        const name2 = content.slice(i, i + 2);
        if (isLikelyZhName(name2)) {
          const score = (candidates.get(name2) || 0) + m.confidence;
          candidates.set(name2, score);
        }
      }
      // Try 3-character name
      if (i + 2 < content.length && /[一-龥]/.test(content[i + 2])) {
        const name3 = content.slice(i, i + 3);
        if (isLikelyZhName(name3)) {
          const score = (candidates.get(name3) || 0) + m.confidence;
          candidates.set(name3, score);
        }
      }
    }

    // Extract English names
    const enNameRegex = /\b[A-Z][a-z]{1,10}\b/g;
    const enMatches = (m.content.match(enNameRegex) || []).filter((name) => {
      return !EN_NAME_STOPWORDS.has(name) && name.length >= 2 && name.length <= 10;
    });
    for (const name of enMatches) {
      const score = (candidates.get(name) || 0) + m.confidence;
      candidates.set(name, score);
    }
  }

  const sorted = Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5);

  if (sorted.length < 5) {
    for (const name of fallbackNames) {
      if (!sorted.includes(name)) sorted.push(name);
      if (sorted.length >= 5) break;
    }
  }

  return sorted.slice(0, 5);
}

export async function generateStoryOpening(names: string[]): Promise<StoryRelayResponse> {
  const prompt = buildOpeningPrompt(names);
  const completion = await deepseekClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a bilingual storyteller. Always respond with valid JSON matching the requested schema." },
      { role: "user", content: prompt + "\n\n必须输出 JSON：" + OUTPUT_SCHEMA },
    ],
    temperature: 0.85,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const parsed = parseStoryRelayResponse(raw);
  if (!parsed) throw new Error("Failed to parse opening response: " + raw);

  const check = isContentAllowed(parsed.storyZh, parsed.storyEn);
  if (!check.allowed) {
    throw new Error("CONTENT_BLOCKED:" + check.reason);
  }

  return parsed;
}

export async function generateStoryContinuation(
  names: string[],
  segmentCount: number,
  latestQuestion: string,
  userInput: string,
  userName: string
): Promise<StoryRelayResponse> {
  const prompt = buildContinuePrompt(names, segmentCount, latestQuestion, userInput, userName);
  const completion = await deepseekClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a bilingual storyteller. Always respond with valid JSON matching the requested schema." },
      { role: "user", content: prompt + "\n\n必须输出 JSON：" + OUTPUT_SCHEMA },
    ],
    temperature: 0.85,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const parsed = parseStoryRelayResponse(raw);
  if (!parsed) throw new Error("Failed to parse continuation response: " + raw);

  const check = isContentAllowed(parsed.storyZh, parsed.storyEn);
  if (!check.allowed) {
    throw new Error("CONTENT_BLOCKED:" + check.reason);
  }

  return parsed;
}
