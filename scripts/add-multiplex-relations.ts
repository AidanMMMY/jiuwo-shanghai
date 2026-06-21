// Add specific multiplex relations with explicit is_current flags.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/add-multiplex-relations.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

async function findEntityId(name: string): Promise<number | null> {
  const result = await sql`
    SELECT id FROM darkroom_entities
    WHERE LOWER(name) = ${name.toLowerCase()}
       OR EXISTS (
         SELECT 1 FROM unnest(aliases) AS alias
         WHERE LOWER(alias) = ${name.toLowerCase()}
       )
    LIMIT 1
  `;
  return result.rows.length > 0 ? (result.rows[0] as { id: number }).id : null;
}

async function addRelation(a: string, b: string, type: string, isCurrent: boolean) {
  const aId = await findEntityId(a);
  const bId = await findEntityId(b);
  if (!aId || !bId) {
    console.log(`Skip ${a}-${b}: entity not found`);
    return;
  }
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);
  try {
    await sql`
      INSERT INTO darkroom_entity_relations (entity_a_id, entity_b_id, relation_type, is_current, confidence)
      VALUES (${left}, ${right}, ${type}, ${isCurrent}, 0.9)
      ON CONFLICT (entity_a_id, entity_b_id, relation_type) DO UPDATE
      SET is_current = EXCLUDED.is_current, confidence = GREATEST(EXCLUDED.confidence, darkroom_entity_relations.confidence)
    `;
    console.log(`Added/updated ${a}-${b} (${type}, current=${isCurrent})`);
  } catch (err) {
    console.error(`Failed ${a}-${b}:`, err);
  }
}

async function main() {
  await sql`ALTER TABLE darkroom_entity_relations ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE`;

  await addRelation('Aidan', 'Dex', 'crush', true);
  await addRelation('Aidan', 'Bob', 'crush', false);
  await addRelation('Zack', 'Phillip', 'date', false);
  await addRelation('Zack', 'Phillip', 'fwb', false);

  const count = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log(`\nTotal relations: ${(count.rows[0] as { c: number }).c}`);
}

main().catch(console.error);
