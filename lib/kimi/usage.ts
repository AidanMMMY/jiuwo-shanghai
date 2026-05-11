import fs from "fs";
import path from "path";

export interface TokenUsageRecord {
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const USAGE_FILE = path.join(process.cwd(), ".kimi-usage.json");

function readUsage(): TokenUsageRecord[] {
  if (!fs.existsSync(USAGE_FILE)) return [];
  try {
    const data = fs.readFileSync(USAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsage(records: TokenUsageRecord[]) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(records, null, 2));
}

export function recordUsage(record: TokenUsageRecord) {
  const records = readUsage();
  records.push(record);
  writeUsage(records);
}

export function getUsageStats(): {
  totalRecords: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  byModel: Record<string, { calls: number; tokens: number }>;
  recent: TokenUsageRecord[];
} {
  const records = readUsage();
  const totalPromptTokens = records.reduce((s, r) => s + r.promptTokens, 0);
  const totalCompletionTokens = records.reduce((s, r) => s + r.completionTokens, 0);
  const totalTokens = records.reduce((s, r) => s + r.totalTokens, 0);

  const byModel: Record<string, { calls: number; tokens: number }> = {};
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { calls: 0, tokens: 0 };
    byModel[r.model].calls++;
    byModel[r.model].tokens += r.totalTokens;
  }

  return {
    totalRecords: records.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    byModel,
    recent: records.slice(-10).reverse(),
  };
}

export function clearUsage() {
  if (fs.existsSync(USAGE_FILE)) {
    fs.unlinkSync(USAGE_FILE);
  }
}
