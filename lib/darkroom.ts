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
  identityProbePrompts: string[];
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

export const KNOWN_ENTITIES: KnownEntity[] = [
  {
    name: "Aidan",
    aliases: ["aidan"],
    enHint:
      "A core face behind JIUWO. Knows the owners and regulars well. Wine enthusiast. Tends to commandeer the speakers and curate the room's soundtrack. Hands-on with people he likes. Locked in a gossip-cold-war with Lao Wang.",
    zhHint:
      "啾喔的核心面孔之一。与老板和常客都很熟。爱喝葡萄酒，喜欢霸占啾喔的音响放歌，对喜欢的人会忍不住动手动脚。与老王有互相爆料的制衡关系。",
  },
  {
    name: "Icky",
    aliases: ["icky", "阿远"],
    enHint:
      "Classical mind, athletic frame. Deep into ru ware and tea culture; can read time from a cup's crackle. Xiaohongshu presence.",
    zhHint:
      "腹有典籍，身有筋骨。精通汝瓷与茶文化，能从一只杯子的开片里讲出时间。小红书可追踪。",
  },
  {
    name: "Dex",
    aliases: ["dex"],
    enHint:
      "Quiet presence, warm heart. Lives by a steady rhythm and dislikes interruptions. Instagram: dex0912f. In a long-term stable relationship; keeps a small, close circle at the bar.",
    zhHint:
      "话不多，心很热。生活作息规律，不喜欢节奏被打破。Instagram: dex0912f。感情稳定长跑中，在店内与少数几人亲近。",
  },
  {
    name: "Morris",
    aliases: ["morris", "莫里斯"],
    enHint: "Sharp gaze, softer smile. Strikingly good-looking whether the hair is long or short.",
    zhHint: "眼神锋利，笑却温柔。无论长发短发都很帅气，外形自带辨识度。",
  },
  {
    name: "AGNOSIA",
    aliases: ["agnosia", "勺子"],
    enHint:
      "Born this way. Die-hard Lady Gaga fan. Sunny, handsome, widely considered someone's type.",
    zhHint: "生而如此。Lady Gaga 的死忠粉，阳光帅气，是很多人眼中的天菜。",
  },
  {
    name: "Zack",
    aliases: ["zack", "扎克", "渣克"],
    enHint:
      "Affect module runs hot, re-compiles at every input. Instagram: zack121391, Xiaohongshu. Falls for sunsets, drinks, and people in equal measure. Reticent under pressure; truths tend to surface late.",
    zhHint:
      "情感模块高温运行，每次输入都重新编译。Instagram: zack121391，小红书。会为日落、酒和人心动。嘴硬型选手，真相往往在逼问后才姗姗来迟。",
  },
  {
    name: "D.F",
    aliases: ["d.f", "df", "豆腐"],
    enHint:
      "Brings the vibe wherever he goes. Loyal to friends and particular about his image; enters a room with his own gravity.",
    zhHint: "有他在，气氛永远在线。对朋友重情重义，注重自身形象，出场自带气场。",
  },
  {
    name: "Josh_Hu",
    aliases: ["josh_hu", "josh hu", "josh", "josh_hmy"],
    enHint:
      "An old friend who brings the good energy. Instagram: Josh_hmy, Xiaohongshu. However noisy the room gets, his arrival settles it.",
    zhHint:
      "自带好心情的老朋友。Instagram: Josh_hmy，小红书。不管房间多吵，他一来气氛就稳了。",
  },
  {
    name: "PP",
    aliases: ["pp", "鹏鹏"],
    enHint: "Weekend protocols incomplete without this signature. Xiaohongshu. Weekends are better with PP around.",
    zhHint: "缺少此签名，周末协议不完整。小红书。有 PP 在的周末才完整。",
  },
  {
    name: "Tee",
    aliases: ["tee", "老王"],
    enHint:
      "Also known as Lao Wang. This bar is his and Gary's joint operation. Quiet, emotionally steady, well-liked. Rich relationship history; locked in a gossip-cold-war with Aidan.",
    zhHint:
      "又名老王。这家酒吧是他与 Gary 一起打理的地方。话不多，情绪稳定，被很多人喜欢。情史丰富，与 Aidan 有互相爆料的制衡关系。",
  },
  {
    name: "Phillip",
    aliases: ["phillip", "小马", "马哥"],
    enHint:
      "Also known as Xiao Ma / Ma Ge. Went from stranger to family; one of the bar's most frequent faces. Gets along with many regulars and turns heads doing it.",
    zhHint:
      "又名小马、马哥。从陌生人变成了这里的老面孔，大概是啾喔最常来的客人之一。与很多常客关系都好，外形迷人，被不少人喜欢。",
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
  isZh?: boolean,
  knownName?: string,
  sessionId?: string
): Promise<{ content: string; source: string; timestamp: string; recognizedName?: string | null }> {
  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, isZh, knownName, sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || (isZh ? "信号丢失" : "Signal lost"));
  }

  return res.json();
}
