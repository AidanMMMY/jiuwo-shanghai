// Delete the Owen-Phillip fwb relation.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/delete-owen-phillip-fwb.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error('No DB URL');
const sql = neon(url, { fullResults: true });

async function main() {
  const owen = await sql`SELECT id FROM darkroom_entities WHERE LOWER(name) = 'owen'`;
  const phillip = await sql`SELECT id FROM darkroom_entities WHERE LOWER(name) = 'phillip'`;
  const owenId = (owen.rows[0] as { id: number } | undefined)?.id;
  const phillipId = (phillip.rows[0] as { id: number } | undefined)?.id;
  if (!owenId || !phillipId) {
    console.log('Entity not found');
    return;
  }
  const left = Math.min(owenId, phillipId);
  const right = Math.max(owenId, phillipId);
  const result = await sql`
    DELETE FROM darkroom_entity_relations
    WHERE entity_a_id = ${left} AND entity_b_id = ${right} AND relation_type = 'fwb'
    RETURNING id
  `;
  console.log('Deleted rows:', result.rows);
  const count = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log('Total relations:', (count.rows[0] as { c: number }).c);
}

main().catch(console.error);
