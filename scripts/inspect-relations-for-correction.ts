// Inspect entities and relations for batch correction.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/inspect-relations-for-correction.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

async function findEntity(name: string) {
  const result = await sql`
    SELECT id, name, aliases, entity_type FROM darkroom_entities
    WHERE LOWER(name) = ${name.toLowerCase()}
       OR EXISTS (
         SELECT 1 FROM unnest(aliases) AS alias
         WHERE LOWER(alias) = ${name.toLowerCase()}
       )
    LIMIT 1
  `;
  return result.rows[0] as { id: number; name: string; aliases: string[]; entity_type: string } | undefined;
}

async function findRelation(a: string, b: string, type?: string) {
  const result = await sql`
    SELECT r.id, a.name as a, b.name as b, r.relation_type, r.is_current, r.confidence
    FROM darkroom_entity_relations r
    JOIN darkroom_entities a ON a.id = r.entity_a_id
    JOIN darkroom_entities b ON b.id = r.entity_b_id
    WHERE (
      (LOWER(a.name) = ${a.toLowerCase()} AND LOWER(b.name) = ${b.toLowerCase()})
      OR (LOWER(a.name) = ${b.toLowerCase()} AND LOWER(b.name) = ${a.toLowerCase()})
    )
    ${type ? sql`AND r.relation_type = ${type}` : sql``}
  `;
  return result.rows;
}

async function main() {
  const names = ['Ray', '梦子', 'Tee', 'Gary', 'Aidan', 'Icky', 'Zack', '阿林', 'Alex', 'ff', '锋锋', '小马', '颜鸣', 'Owen', '老王', '大鹏', 'Phillip'];
  console.log('=== Entities ===');
  for (const name of names) {
    const e = await findEntity(name);
    console.log(name, '->', e ? { id: e.id, name: e.name, aliases: e.aliases, type: e.entity_type } : 'NOT FOUND');
  }

  const pairs = [
    ['Ray', '梦子'],
    ['Tee', 'Gary'],
    ['Aidan', 'Icky'],
    ['Zack', '阿林'],
    ['Tee', 'Alex'],
    ['小马', '颜鸣'],
    ['Owen', '小马'],
    ['老王', '大鹏'],
    ['Tee', '大鹏'],
    ['Phillip', '颜鸣'],
  ];
  console.log('\n=== Relations ===');
  for (const [a, b] of pairs) {
    const rows = await findRelation(a, b);
    console.log(`${a} - ${b}:`, rows.length ? rows : 'NONE');
  }
}

main().catch(console.error);
