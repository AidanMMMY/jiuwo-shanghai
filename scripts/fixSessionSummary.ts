import { neon } from "@neondatabase/serverless";

function getSql() {
  const url =
    process.env.POSTGRES_URL ||
    process.env.GUESTBOOK_POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!url) throw new Error("No Postgres URL configured");
  return neon(url, { fullResults: true });
}

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: npx tsx scripts/fixSessionSummary.ts <session_id> [new_summary]");
    process.exit(1);
  }
  const newSummary = process.argv[3] ?? "";

  const sql = getSql();
  const result = await sql`
    UPDATE darkroom_sessions
    SET summary = ${newSummary}, updated_at = NOW()
    WHERE session_id = ${sessionId}
    RETURNING session_id, summary
  `;
  if (result.rows.length === 0) {
    console.log("Session not found.");
    return;
  }
  console.log(`Updated session ${sessionId} summary to:`);
  console.log(result.rows[0].summary || "(empty)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
