// Merge duplicate entities in darkroom_entities.
// For each canonical name, keep the entity with source='knowledge_base' (or lowest id),
// migrate memory_links and relations, then delete duplicates.
//
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/merge-duplicate-entities.ts

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
  source: string;
  mention_count: number;
}

async function main() {
  console.log('=== Finding duplicate entities ===\n');

  const entitiesRes = await sql`
    SELECT id, name, aliases, source, mention_count
    FROM darkroom_entities
    ORDER BY id
  `;
  const entities = entitiesRes.rows as Entity[];

  // Build a map from every possible mention (name + aliases, lowercased) to entity ids.
  const mentionToIds = new Map<string, Set<number>>();
  for (const e of entities) {
    const mentions = [e.name, ...(e.aliases || [])].map((m) => m.trim().toLowerCase()).filter(Boolean);
    for (const m of mentions) {
      if (!mentionToIds.has(m)) mentionToIds.set(m, new Set());
      mentionToIds.get(m)!.add(e.id);
    }
  }

  // Group entities that share at least one mention.
  const groups: Map<number, Set<number>> = new Map();
  function findRoot(id: number): number {
    if (!groups.has(id)) groups.set(id, new Set([id]));
    return id;
  }
  for (const [mention, ids] of mentionToIds) {
    if (ids.size < 2) continue;
    const idArray = Array.from(ids);
    const root = Math.min(...idArray);
    if (!groups.has(root)) groups.set(root, new Set());
    for (const id of idArray) {
      groups.get(root)!.add(id);
    }
  }

  // Filter to actual groups with duplicates.
  const duplicateGroups: Array<Set<number>> = [];
  for (const group of groups.values()) {
    if (group.size >= 2) duplicateGroups.push(group);
  }

  // Deduplicate groups (a group may have been created multiple times via different mentions).
  const seenGroups = new Set<string>();
  const uniqueGroups: Array<Set<number>> = [];
  for (const group of duplicateGroups) {
    const key = Array.from(group).sort((a, b) => a - b).join(',');
    if (!seenGroups.has(key)) {
      seenGroups.add(key);
      uniqueGroups.push(group);
    }
  }

  console.log(`Found ${uniqueGroups.length} duplicate groups\n`);

  let totalDeleted = 0;
  let totalMemoryLinksMigrated = 0;
  let totalRelationsMigrated = 0;

  for (const group of uniqueGroups) {
    const groupEntities = entities.filter((e) => group.has(e.id));
    console.log('Group:', groupEntities.map((e) => `${e.id}:${e.name}(${e.source})`).join(', '));

    // Choose canonical: prefer knowledge_base, then lowest id.
    const canonical =
      groupEntities.find((e) => e.source === 'knowledge_base') ||
      groupEntities.sort((a, b) => a.id - b.id)[0];
    const duplicates = groupEntities.filter((e) => e.id !== canonical.id);

    console.log(`  canonical: ${canonical.id}:${canonical.name}, duplicates: ${duplicates.map((d) => d.id).join(',')}`);

    for (const dup of duplicates) {
      // Migrate memory_entities links.
      const memoryLinksRes = await sql`
        UPDATE darkroom_memory_entities
        SET entity_id = ${canonical.id}
        WHERE entity_id = ${dup.id}
        RETURNING memory_id, entity_id, role, confidence
      `;
      const migratedMemoryLinks = memoryLinksRes.rows.length;
      totalMemoryLinksMigrated += migratedMemoryLinks;
      console.log(`    migrated ${migratedMemoryLinks} memory_links`);

      // Migrate relations where duplicate is entity_a.
      const relationsARes = await sql`
        UPDATE darkroom_entity_relations
        SET entity_a_id = ${canonical.id}
        WHERE entity_a_id = ${dup.id}
        RETURNING id
      `;
      const migratedA = relationsARes.rows.length;

      // Migrate relations where duplicate is entity_b.
      const relationsBRes = await sql`
        UPDATE darkroom_entity_relations
        SET entity_b_id = ${canonical.id}
        WHERE entity_b_id = ${dup.id}
        RETURNING id
      `;
      const migratedB = relationsBRes.rows.length;

      totalRelationsMigrated += migratedA + migratedB;
      console.log(`    migrated ${migratedA + migratedB} relations`);

      // Delete duplicate.
      await sql`DELETE FROM darkroom_entities WHERE id = ${dup.id}`;
      totalDeleted++;
      console.log(`    deleted duplicate ${dup.id}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Duplicate groups: ${uniqueGroups.length}`);
  console.log(`Entities deleted: ${totalDeleted}`);
  console.log(`Memory links migrated: ${totalMemoryLinksMigrated}`);
  console.log(`Relations migrated: ${totalRelationsMigrated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
