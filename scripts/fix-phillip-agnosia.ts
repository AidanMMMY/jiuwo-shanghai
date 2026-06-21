import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error('No DB URL');
const sql = neon(url, { fullResults: true });

async function main() {
  const agnosia = await sql`SELECT id FROM darkroom_entities WHERE name = 'AGNOSIA'`;
  const phillip = await sql`SELECT id FROM darkroom_entities WHERE name = 'Phillip'`;
  const aId = (agnosia.rows[0] as { id: number }).id;
  const bId = (phillip.rows[0] as { id: number }).id;
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);

  const find = await sql`SELECT id FROM darkroom_entity_relations WHERE entity_a_id = ${bId} AND entity_b_id = ${aId} AND relation_type = 'friend'`;
  for (const row of find.rows) {
    await sql`DELETE FROM darkroom_entity_relations WHERE id = ${(row as { id: number }).id}`;
    console.log('Deleted mis-directed friend id:', (row as { id: number }).id);
  }

  const inserted = await sql`
    INSERT INTO darkroom_entity_relations (entity_a_id, entity_b_id, relation_type, is_current, confidence)
    VALUES (${left}, ${right}, 'friend', TRUE, 0.9)
    ON CONFLICT (entity_a_id, entity_b_id, relation_type) DO UPDATE
    SET is_current = TRUE, confidence = GREATEST(EXCLUDED.confidence, darkroom_entity_relations.confidence)
    RETURNING id, entity_a_id, entity_b_id, relation_type, is_current
  `;
  console.log('Unified friend:', inserted.rows);

  const verify = await sql`
    SELECT a.name as a, b.name as b, r.relation_type, r.is_current
    FROM darkroom_entity_relations r
    JOIN darkroom_entities a ON a.id = r.entity_a_id
    JOIN darkroom_entities b ON b.id = r.entity_b_id
    WHERE (a.name = 'Phillip' AND b.name = 'AGNOSIA') OR (a.name = 'AGNOSIA' AND b.name = 'Phillip')
  `;
  console.log('Final:', verify.rows);
}

main().catch(console.error);
