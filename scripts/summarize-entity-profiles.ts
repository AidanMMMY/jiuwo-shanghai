import { summarizeAllEntityProfiles } from '../lib/darkroom-entity-summary';

async function main() {
  const limit = process.env.SUMMARIZE_LIMIT ? parseInt(process.env.SUMMARIZE_LIMIT, 10) : 50;
  const minMentionCount = process.env.SUMMARIZE_MIN_MENTIONS
    ? parseInt(process.env.SUMMARIZE_MIN_MENTIONS, 10)
    : 2;

  console.log(`=== Entity profile summarization: limit=${limit}, minMentionCount=${minMentionCount} ===`);
  const processed = await summarizeAllEntityProfiles({ limit, minMentionCount, isZh: true });
  console.log(`summarized ${processed} entity profiles`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
