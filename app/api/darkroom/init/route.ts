import { NextRequest, NextResponse } from "next/server";
import { deepseekClient, DEFAULT_MODEL } from "@/lib/deepseek/client";
import { getDarkroomData } from "@/lib/darkroom";

export async function POST(req: NextRequest) {
  let isZh = false;

  try {
    const body = await req.json();
    isZh = !!body.isZh;
    const data = getDarkroomData(isZh);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "dummy-key-for-build") {
      return NextResponse.json({
        entries: data.initialEntries,
        source: "static",
      });
    }

    const prompt = isZh
      ? `生成3条终端系统日志，纯JSON格式，不要markdown包裹。风格：Matrix/Black Mirror——现实是构造体/渲染层/模拟，你是某个不该被访问的诊断系统。结构：{"entries":[{"id":"gen-1","timestamp":"02:33:08","location":"系统","action":"简短动作描述","message":"1-2句消息，暗黑神秘","type":"log","tags":["标签"]},{"id":"gen-2","timestamp":"02:33:09","location":"？？？","action":"...","message":"...","type":"broadcast"},{"id":"gen-3","timestamp":"02:33:11","location":"本地","action":"...","message":"...","type":"log"}]}。location必须是"系统"、"？？？"或"本地"之一。第2条type必须是broadcast，其余是log。内容每次不同，不要重复。`
      : `Generate 3 terminal system log entries as pure JSON, no markdown wrapping. Style: Matrix/Black Mirror — reality is a construct/render/simulation, you're a diagnostic interface that wasn't meant to be accessed. Structure: {"entries":[{"id":"gen-1","timestamp":"02:33:08","location":"SYSTEM","action":"short action","message":"1-2 sentences, dark and mysterious","type":"log","tags":["TAG"]},{"id":"gen-2","timestamp":"02:33:09","location":"? ? ?","action":"...","message":"...","type":"broadcast"},{"id":"gen-3","timestamp":"02:33:11","location":"LOCAL","action":"...","message":"...","type":"log"}]}. Location must be "SYSTEM", "? ? ?", or "LOCAL". Entry 2 type must be broadcast, others log. Content must vary each time.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const completion = await deepseekClient.chat.completions.create(
        {
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: data.systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.95,
          max_tokens: 500,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);
      const raw = completion.choices[0]?.message?.content || "";
      const parsed = JSON.parse(raw);

      let entries = [];
      if (Array.isArray(parsed.entries)) {
        entries = parsed.entries;
      } else if (Array.isArray(parsed)) {
        entries = parsed;
      }

      // Validate and sanitize
      entries = entries.slice(0, 3).map((e: Record<string, unknown>, i: number) => ({
        id: typeof e.id === "string" ? e.id : `gen-${i + 1}`,
        timestamp: typeof e.timestamp === "string" ? e.timestamp : "02:33:08",
        location: typeof e.location === "string" ? e.location : (isZh ? "系统" : "SYSTEM"),
        action: typeof e.action === "string" ? e.action : "",
        message: typeof e.message === "string" ? e.message : "",
        type: (typeof e.type === "string" && e.type === "broadcast") || i === 1 ? "broadcast" : "log",
        tags: Array.isArray(e.tags) ? e.tags.filter((t: unknown) => typeof t === "string") : undefined,
      }));

      return NextResponse.json({ entries, source: "generated" });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      throw fetchError;
    }
  } catch {
    const data = getDarkroomData(isZh);
    return NextResponse.json({
      entries: data.initialEntries,
      source: "static",
    });
  }
}
