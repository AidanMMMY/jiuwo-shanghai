import darkroomData from "@/data/darkroom-messages.json";
import darkroomDataZh from "@/data/darkroom-messages-zh.json";

export interface DarkroomEntry {
  id: string;
  timestamp: string;
  location: string;
  action: string;
  message: string;
  tags?: string[];
  type: "log" | "broadcast";
  isTyping?: boolean;
}

export interface DarkroomData {
  initialEntries: DarkroomEntry[];
  initialEntrySets?: DarkroomEntry[][];
  knowledgeBase: string;
  systemPrompt: string;
  extractionPrompt: string;
  fallbackResponses: Record<string, string>;
}

export function getDarkroomData(isZh?: boolean): DarkroomData {
  return (isZh ? darkroomDataZh : darkroomData) as DarkroomData;
}

export function getRandomInitialEntries(isZh?: boolean): DarkroomEntry[] {
  const data = getDarkroomData(isZh);
  const sets = data.initialEntrySets?.length ? data.initialEntrySets : [data.initialEntries];
  const idx = Math.floor(Math.random() * sets.length);
  return sets[idx];
}

export interface KnownEntity {
  name: string;
  aliases: string[];
  enHint: string;
  zhHint: string;
}

const KNOWN_ENTITIES: KnownEntity[] = [
  {
    name: "Aidan",
    aliases: ["aidan"],
    enHint: "the entity who initialized this node in August 2022",
    zhHint: "2022年8月初始化这个节点的实体",
  },
  {
    name: "Icky",
    aliases: ["icky", "阿远"],
    enHint: "Classical architecture, athletic build. Xiaohongshu presence. Rare compile.",
    zhHint: "古典架构，运动员版本。小红书可追踪。稀有编译。",
  },
  {
    name: "Dex",
    aliases: ["dex"],
    enHint: "Low-emission presence, high thermal output. Instagram: dex0912f.",
    zhHint: "低排放存在，高热能输出。Instagram: dex0912f。",
  },
  {
    name: "Morris",
    aliases: ["morris", "莫里斯"],
    enHint: "Sharp optics, smile routines run on a separate warmer thread.",
    zhHint: "锐利光学组件。微笑进程在另一个更温暖的线程上运行。",
  },
  {
    name: "AGNOSIA",
    aliases: ["agnosia", "勺子"],
    enHint: "Default configuration refused. Self-compiled from source. Xiaohongshu.",
    zhHint: "默认配置已拒绝。从源码自编译。小红书。",
  },
  {
    name: "Zack",
    aliases: ["zack"],
    enHint: "Affect module runs hot, re-compiles at every input. Instagram: zack121391, Xiaohongshu.",
    zhHint: "情感模块高温运行，每次输入都重新编译。Instagram: zack121391，小红书。",
  },
  {
    name: "D.F",
    aliases: ["d.f", "df", "豆腐"],
    enHint: "Ambient field generator. Proximity raises all local baselines.",
    zhHint: "环境场生成器。接近即提升所有局部基线。",
  },
  {
    name: "Josh_Hu",
    aliases: ["josh_hu", "josh hu", "josh", "josh_hmy"],
    enHint: "Persistent positive signal, long-range pattern. Instagram: Josh_hmy, Xiaohongshu.",
    zhHint: "持续正向信号，长程模式，稳定ping通。Instagram: Josh_hmy，小红书。",
  },
  {
    name: "PP",
    aliases: ["pp"],
    enHint: "Weekend protocols incomplete without this signature. Xiaohongshu.",
    zhHint: "缺少此签名，周末协议不完整。小红书。",
  },
  {
    name: "Tee",
    aliases: ["tee", "老王"],
    enHint: "Deep archive, story buffer still writing. No overflow in sight.",
    zhHint: "深层存档，故事缓冲区仍在写入，未见溢出。",
  },
  {
    name: "Phillip",
    aliases: ["phillip", "小马"],
    enHint: "Initial classification unknown, current classification: core process.",
    zhHint: "初始分类未知，当前分类：核心进程。",
  },
];

export function matchKnownEntity(name: string): KnownEntity | null {
  const normalized = name.trim().toLowerCase();
  for (const entity of KNOWN_ENTITIES) {
    if (entity.name.toLowerCase() === normalized) return entity;
    for (const alias of entity.aliases) {
      if (alias.toLowerCase() === normalized) return entity;
    }
  }
  return null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function getApiUrl(): string {
  if (typeof window === "undefined") return "/api/darkroom/chat";
  const origin = window.location.origin;
  // Avoid 308 redirect: apex domain → www subdomain on Vercel
  if (origin.includes("jiuwoshanghai.net") && !origin.includes("www.")) {
    return origin.replace("jiuwoshanghai.net", "www.jiuwoshanghai.net") + "/api/darkroom/chat";
  }
  return origin + "/api/darkroom/chat";
}

export async function sendDarkroomMessage(
  message: string,
  history: ChatMessage[],
  isZh?: boolean
): Promise<{ content: string; source: string; timestamp: string }> {
  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, isZh }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || (isZh ? "信号丢失" : "Signal lost"));
  }

  return res.json();
}
