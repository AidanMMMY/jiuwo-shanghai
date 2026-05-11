#!/usr/bin/env tsx
import { getUsageStats, clearUsage } from "@/lib/kimi/usage";

const args = process.argv.slice(2);
const command = args[0];

if (command === "clear") {
  clearUsage();
  console.log("\x1b[32m✓ Token usage history cleared\x1b[0m");
  process.exit(0);
}

const stats = getUsageStats();

console.log("\n┌─────────────────────────────────────────┐");
console.log("│         🌙 Kimi Token Usage             │");
console.log("├─────────────────────────────────────────┤");
console.log(`│  Total API Calls:    ${String(stats.totalRecords).padEnd(25)}│`);
console.log(`│  Prompt Tokens:       ${String(stats.totalPromptTokens.toLocaleString()).padEnd(25)}│`);
console.log(`│  Completion Tokens:   ${String(stats.totalCompletionTokens.toLocaleString()).padEnd(25)}│`);
console.log(`│  Total Tokens:        ${String(stats.totalTokens.toLocaleString()).padEnd(25)}│`);
console.log("├─────────────────────────────────────────┤");
console.log("│  Usage by Model:                        │");

Object.entries(stats.byModel).forEach(([model, data]) => {
  const line = `│    ${model}: ${data.calls} calls, ${data.tokens.toLocaleString()} tokens`;
  console.log(line.padEnd(42) + "│");
});

if (Object.keys(stats.byModel).length === 0) {
  console.log("│    (no usage recorded yet)              │");
}

console.log("├─────────────────────────────────────────┤");
console.log("│  Recent Calls (last 10):                │");

if (stats.recent.length === 0) {
  console.log("│    (no recent activity)                 │");
} else {
  stats.recent.forEach((r) => {
    const time = new Date(r.timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const line = `│    ${time}  ${r.totalTokens.toString().padStart(5)} tok  ${r.model}`;
    console.log(line.substring(0, 41).padEnd(42) + "│");
  });
}

console.log("└─────────────────────────────────────────┘");
console.log("\nRun \x1b[36mnpx tsx scripts/kimi-usage.ts clear\x1b[0m to reset stats.\n");
