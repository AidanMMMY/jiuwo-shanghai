import { neon } from '@neondatabase/serverless';
import { KNOWN_ENTITIES } from '../lib/darkroom';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

async function main() {
  const sql = getSql();
  const names = KNOWN_ENTITIES.map((e) => e.name);
  const result = await sql`
    UPDATE darkroom_entities
    SET source = 'knowledge_base'
    WHERE name = ANY(${names}::text[])
    RETURNING name, source
  `;
  console.log(`updated ${result.rowCount ?? 0} entities to knowledge_base`);
  for (const row of result.rows as Array<{ name: string; source: string }>) {
    console.log(`  ${row.name}: ${row.source}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
