import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error('No DB URL');
const sql = neon(url, { fullResults: true });

async function updateRelation(nameA: string, nameB: string, newType: string) {
  const find = await sql`
    SELECT r.id, a.name as a, b.name as b, r.relation_type
    FROM darkroom_entity_relations r
    JOIN darkroom_entities a ON a.id = r.entity_a_id
    JOIN darkroom_entities b ON b.id = r.entity_b_id
    WHERE (a.name = ${nameA} AND b.name = ${nameB})
       OR (a.name = ${nameB} AND b.name = ${nameA})
  `;
  if (find.rows.length === 0) {
    console.log('Not found:', nameA, '-', nameB);
    return;
  }
  for (const row of find.rows) {
    const r = row as { id: number; a: string; b: string; relation_type: string };
    await sql`UPDATE darkroom_entity_relations SET relation_type = ${newType} WHERE id = ${r.id}`;
    console.log(`Updated ${r.a}-${r.b}: ${r.relation_type} -> ${newType} (id=${r.id})`);
  }
}

async function main() {
  await updateRelation('Aidan', 'Phillip', 'friend');
  await updateRelation('Zack', 'Phillip', 'friend');
  await updateRelation('D.F', 'David', 'lover');
  await updateRelation('Aidan', 'Dex', 'friend');
  await updateRelation('Aidan', 'Bob', 'friend');
}

main().catch(console.error);
