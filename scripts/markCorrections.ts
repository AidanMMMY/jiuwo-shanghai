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
  const ids = [180, 192, 724];
  const sql = getSql();
  const result = await sql`
    UPDATE darkroom_memories
    SET memory_type = 'correction', updated_at = NOW()
    WHERE id = ANY(${ids}::int[])
    RETURNING id, content, memory_type
  `;
  console.log(`Updated ${result.rows.length} memories to correction:`);
  for (const row of result.rows as { id: number; content: string; memory_type: string }[]) {
    console.log(`#${row.id} [${row.memory_type}] ${row.content.slice(0, 80)}...`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
