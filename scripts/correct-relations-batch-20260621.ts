// Batch correction of entity relations based on user input 2026-06-21.
// Run with: node --env-file=.env.local ./node_modules/.bin/tsx scripts/correct-relations-batch-20260621.ts

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

async function upsertRelation(aId: number, bId: number, type: string, isCurrent: boolean, confidence = 0.9) {
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);
  await sql`
    INSERT INTO darkroom_entity_relations (entity_a_id, entity_b_id, relation_type, is_current, confidence)
    VALUES (${left}, ${right}, ${type}, ${isCurrent}, ${confidence})
    ON CONFLICT (entity_a_id, entity_b_id, relation_type) DO UPDATE
    SET is_current = EXCLUDED.is_current, confidence = GREATEST(EXCLUDED.confidence, darkroom_entity_relations.confidence)
  `;
}

async function updateRelationType(aId: number, bId: number, oldType: string, newType: string, isCurrent: boolean) {
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);
  await sql`
    UPDATE darkroom_entity_relations
    SET relation_type = ${newType}, is_current = ${isCurrent}
    WHERE entity_a_id = ${left} AND entity_b_id = ${right} AND relation_type = ${oldType}
  `;
}

async function updateRelationCurrent(aId: number, bId: number, type: string, isCurrent: boolean) {
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);
  await sql`
    UPDATE darkroom_entity_relations
    SET is_current = ${isCurrent}
    WHERE entity_a_id = ${left} AND entity_b_id = ${right} AND relation_type = ${type}
  `;
}

async function deleteRelation(aId: number, bId: number, type: string) {
  const left = Math.min(aId, bId);
  const right = Math.max(aId, bId);
  await sql`DELETE FROM darkroom_entity_relations WHERE entity_a_id = ${left} AND entity_b_id = ${right} AND relation_type = ${type}`;
}

async function mergeEntities(canonicalName: string, duplicateName: string, extraAliases: string[] = []) {
  const canonicalId = await findEntityId(canonicalName);
  const duplicateId = await findEntityId(duplicateName);
  if (!canonicalId || !duplicateId) {
    console.log(`Skip merge ${duplicateName} -> ${canonicalName}: one not found`);
    return;
  }
  if (canonicalId === duplicateId) {
    console.log(`${canonicalName} and ${duplicateName} are already the same entity`);
    return;
  }

  // Migrate memory_entities references, ignoring conflicts
  const existingMe = await sql`
    SELECT memory_id, entity_id, role FROM darkroom_memory_entities WHERE entity_id = ${duplicateId}
  `;
  for (const row of existingMe.rows) {
    const r = row as { memory_id: number; entity_id: number; role: string };
    try {
      await sql`
        INSERT INTO darkroom_memory_entities (memory_id, entity_id, role)
        VALUES (${r.memory_id}, ${canonicalId}, ${r.role})
      `;
    } catch {
      // ignore unique violation
    }
  }
  await sql`DELETE FROM darkroom_memory_entities WHERE entity_id = ${duplicateId}`;
  console.log(`Migrated memory_entities for ${duplicateName} -> ${canonicalName}`);

  // Migrate relations one by one to avoid unique conflicts.
  const dupRels = await sql`
    SELECT id, entity_a_id, entity_b_id, relation_type, is_current, confidence
    FROM darkroom_entity_relations
    WHERE entity_a_id = ${duplicateId} OR entity_b_id = ${duplicateId}
  `;
  let migrated = 0;
  let deleted = 0;
  for (const row of dupRels.rows) {
    const r = row as { id: number; entity_a_id: number; entity_b_id: number; relation_type: string; is_current: boolean; confidence: number };
    const otherId = r.entity_a_id === duplicateId ? r.entity_b_id : r.entity_a_id;
    const left = Math.min(canonicalId, otherId);
    const right = Math.max(canonicalId, otherId);
    const existing = await sql`
      SELECT id, confidence FROM darkroom_entity_relations
      WHERE entity_a_id = ${left} AND entity_b_id = ${right} AND relation_type = ${r.relation_type}
    `;
    if (existing.rows.length > 0) {
      // Keep the higher-confidence record and delete the duplicate.
      const existingRow = existing.rows[0] as { id: number; confidence: number };
      const keepCanonical = (existingRow.confidence ?? 0) >= (r.confidence ?? 0);
      if (keepCanonical) {
        await sql`DELETE FROM darkroom_entity_relations WHERE id = ${r.id}`;
      } else {
        await sql`UPDATE darkroom_entity_relations SET confidence = ${r.confidence}, is_current = ${r.is_current} WHERE id = ${existingRow.id}`;
        await sql`DELETE FROM darkroom_entity_relations WHERE id = ${r.id}`;
      }
      deleted++;
    } else {
      await sql`
        UPDATE darkroom_entity_relations
        SET entity_a_id = ${left}, entity_b_id = ${right}
        WHERE id = ${r.id}
      `;
      migrated++;
    }
  }
  console.log(`Migrated relations for ${duplicateName} -> ${canonicalName}: migrated=${migrated}, deduped=${deleted}`);

  // Clean any residual self-relations or duplicates
  await sql`
    DELETE FROM darkroom_entity_relations a
    USING darkroom_entity_relations b
    WHERE a.id > b.id
      AND a.entity_a_id = b.entity_a_id
      AND a.entity_b_id = b.entity_b_id
      AND a.relation_type = b.relation_type
  `;
  await sql`DELETE FROM darkroom_entity_relations WHERE entity_a_id = entity_b_id`;

  // Add aliases from duplicate + extras
  const canonicalEntity = await sql`SELECT name, aliases FROM darkroom_entities WHERE id = ${canonicalId}`;
  const dupEntity = await sql`SELECT name, aliases FROM darkroom_entities WHERE id = ${duplicateId}`;
  const canRow = canonicalEntity.rows[0] as { name: string; aliases: string[] } | undefined;
  const dupRow = dupEntity.rows[0] as { name: string; aliases: string[] } | undefined;
  const aliasSet = new Set<string>([
    canRow?.name ?? canonicalName,
    ...(canRow?.aliases ?? []),
    dupRow?.name ?? duplicateName,
    ...(dupRow?.aliases ?? []),
    ...extraAliases,
  ].map(a => a.trim()).filter(Boolean));
  const aliasesArray = Array.from(aliasSet);
  await sql`UPDATE darkroom_entities SET aliases = ${aliasesArray} WHERE id = ${canonicalId}`;

  // Delete duplicate entity
  await sql`DELETE FROM darkroom_entities WHERE id = ${duplicateId}`;
  console.log(`Merged ${duplicateName} -> ${canonicalName}, aliases:`, aliasesArray);
}

async function main() {
  // 1. Merge ff and 锋锋 (keep ff), add FF alias
  await mergeEntities('ff', '锋锋', ['FF']);

  const ray = await findEntityId('Ray');
  const mengzi = await findEntityId('梦子');
  const tee = await findEntityId('Tee');
  const gary = await findEntityId('Gary');
  const aidan = await findEntityId('Aidan');
  const icky = await findEntityId('Icky');
  const zack = await findEntityId('Zack');
  const alin = await findEntityId('阿林');
  const alex = await findEntityId('Alex');
  const phillip = await findEntityId('Phillip'); // canonical for 小马
  const yanming = await findEntityId('颜鸣');
  const owen = await findEntityId('Owen');
  const dapeng = await findEntityId('大鹏');

  const required = { ray, mengzi, tee, gary, aidan, icky, zack, alin, alex, phillip, yanming, owen, dapeng };
  for (const [k, v] of Object.entries(required)) {
    if (!v) console.log(`Warning: entity ${k} not found`);
  }

  // 2. Ray - 梦子: 以前是同事，现在是朋友
  if (ray && mengzi) {
    await upsertRelation(ray, mengzi, 'friend', true, 0.9);
    await upsertRelation(ray, mengzi, 'colleague', false, 0.9);
    console.log('Ray - 梦子: friend current, colleague past');
  }

  // 3. Tee - Gary: 朋友（当前）
  if (tee && gary) {
    await updateRelationType(tee, gary, 'colleague', 'friend', true);
    console.log('Tee - Gary: colleague -> friend current');
  }

  // 4. Aidan - Icky: 以前 fwb（保留当前 date）
  if (aidan && icky) {
    await upsertRelation(aidan, icky, 'fwb', false, 0.9);
    console.log('Aidan - Icky: added fwb past');
  }

  // 5. Zack - 阿林: 以前 date
  if (zack && alin) {
    await updateRelationCurrent(zack, alin, 'date', false);
    console.log('Zack - 阿林: date -> past');
  }

  // 6. Tee - Alex: 不是前任，以前 date
  if (tee && alex) {
    await updateRelationType(tee, alex, 'ex', 'date', false);
    console.log('Tee - Alex: ex -> date past');
  }

  // 7. 小马(Phillip) - 颜鸣: 曾经 fwb
  if (phillip && yanming) {
    await updateRelationCurrent(phillip, yanming, 'fwb', false);
    console.log('Phillip(小马) - 颜鸣: fwb -> past');
  }

  // 8. Owen - 小马(Phillip): 当前 affair
  if (owen && phillip) {
    await upsertRelation(owen, phillip, 'affair', true, 0.9);
    console.log('Owen - Phillip(小马): affair current');
  }

  // 9. 老王(Tee) - 大鹏: 曾经 date；删除不准确的 mentioned_with
  if (tee && dapeng) {
    await upsertRelation(tee, dapeng, 'date', false, 0.9);
    await deleteRelation(tee, dapeng, 'mentioned_with');
    console.log('Tee(老王) - 大鹏: date past, removed mentioned_with');
  }

  // Verify
  const count = await sql`SELECT COUNT(*) as c FROM darkroom_entity_relations`;
  console.log(`\nTotal relations: ${(count.rows[0] as { c: number }).c}`);
}

main().catch(console.error);
