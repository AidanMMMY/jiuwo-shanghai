// Clean entity relations: normalize duplicate entity aliases, unify direction,
// and deduplicate exact same (a, b, type) records while preserving multiplex relations.
//
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/clean-entity-relations.ts

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

const sql = getSql();

interface Entity {
  id: number;
  name: string;
  aliases: string[];
}

interface Relation {
  id: number;
  entity_a_id: number;
  entity_b_id: number;
  relation_type: string;
  is_current: boolean;
  evidence_memory_id: number | null;
  confidence: number;
}

// Canonical entity -> aliases that should resolve to it.
const CANONICAL_ALIASES: Record<string, string[]> = {
  Phillip: ['Philip'],
  Aidan: ['Aiden'],
  Tee: ['tee（老王）', '老王'],
  Icky: ['阿远（Icky）', '阿远'],
};

async function findEntityByName(name: string): Promise<Entity | null> {
  const lower = name.trim().toLowerCase();
  if (!lower) return null;
  const result = await sql`
    SELECT id, name, aliases
    FROM darkroom_entities
    WHERE LOWER(name) = ${lower}
       OR EXISTS (
         SELECT 1 FROM unnest(aliases) AS alias
         WHERE LOWER(alias) = ${lower}
       )
    LIMIT 1
  `;
  return result.rows.length > 0 ? (result.rows[0] as Entity) : null;
}

async function upsertEntityAliases(name: string, aliases: string[]): Promise<void> {
  const entity = await findEntityByName(name);
  if (!entity) {
    console.log(`  canonical entity not found: ${name}`);
    return;
  }
  const merged = [...new Set([...(entity.aliases || []), ...aliases])];
  await sql`
    UPDATE darkroom_entities
    SET aliases = ${merged}, updated_at = NOW()
    WHERE id = ${entity.id}
  `;
  console.log(`  ${entity.name}: added aliases [${aliases.join(', ')}]`);
}

async function main() {
  console.log('=== Step 0: Ensure schema includes is_current ===\n');
  await sql`ALTER TABLE darkroom_entity_relations ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE`;
  console.log('is_current column ensured');

  console.log('\n=== Step 1: Register canonical aliases ===\n');
  for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
    await upsertEntityAliases(canonical, aliases);
  }

  console.log('\n=== Step 2: Load relations and entities ===\n');
  const relationsRes = await sql`
    SELECT id, entity_a_id, entity_b_id, relation_type, is_current, evidence_memory_id, confidence
    FROM darkroom_entity_relations
    ORDER BY id
  `;
  const relations = relationsRes.rows as Relation[];
  console.log(`Loaded ${relations.length} relations`);

  const entitiesRes = await sql`SELECT id, name, aliases FROM darkroom_entities`;
  const entityById = new Map<number, Entity>();
  for (const e of entitiesRes.rows as Entity[]) {
    entityById.set(e.id, e);
  }

  console.log('\n=== Step 3: Normalize direction and deduplicate exact triples ===\n');
  const kept = new Map<string, Relation>();
  const dropped: Relation[] = [];

  for (const r of relations) {
    const entityA = entityById.get(r.entity_a_id);
    const entityB = entityById.get(r.entity_b_id);
    if (!entityA || !entityB) {
      dropped.push(r);
      continue;
    }

    const canonicalA = await findEntityByName(entityA.name);
    const canonicalB = await findEntityByName(entityB.name);
    const aId = canonicalA?.id ?? r.entity_a_id;
    const bId = canonicalB?.id ?? r.entity_b_id;

    // Unify direction: smaller id first.
    const leftId = Math.min(aId, bId);
    const rightId = Math.max(aId, bId);
    const tripleKey = `${leftId}-${rightId}-${r.relation_type}`;

    const existing = kept.get(tripleKey);
    if (!existing || r.id < existing.id) {
      if (existing) dropped.push(existing);
      kept.set(tripleKey, { ...r, entity_a_id: leftId, entity_b_id: rightId });
    } else {
      dropped.push(r);
    }
  }

  console.log(`Kept ${kept.size} unique (a, b, type) relations, dropping ${dropped.length}`);

  console.log('\n=== Step 4: Rewrite relation table ===\n');
  await sql`DELETE FROM darkroom_entity_relations`;

  for (const rel of kept.values()) {
    await sql`
      INSERT INTO darkroom_entity_relations (entity_a_id, entity_b_id, relation_type, is_current, evidence_memory_id, confidence)
      VALUES (
        ${rel.entity_a_id},
        ${rel.entity_b_id},
        ${rel.relation_type},
        ${rel.is_current},
        ${rel.evidence_memory_id ?? null},
        ${rel.confidence}
      )
    `;
  }

  const finalRes = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log(`Final relation count: ${(finalRes.rows[0] as { c: number }).c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
