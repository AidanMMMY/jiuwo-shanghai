import { neon } from '@neondatabase/serverless';
import { KNOWN_ENTITIES } from '../lib/darkroom';
import { looksLikeName } from '../lib/darkroom-chat';
import {
  ensureEntitiesTable,
  ensureMemoriesTable,
  ensureMemoryEntitiesTable,
  ensureEntityRelationsTable,
  findEntityByName,
  upsertEntity,
  linkMemoryToEntities,
} from '../lib/darkroom-memory';

function getSql() {
  const url = process.env.POSTGRES_URL || process.env.GUESTBOOK_POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  return neon(url, { fullResults: true });
}

async function main() {
  const sql = getSql();

  console.log('=== Phase 0: ensure tables ===');
  await ensureEntitiesTable();
  await ensureMemoriesTable();
  await ensureMemoryEntitiesTable();
  await ensureEntityRelationsTable();

  console.log('=== Phase 1: seed known entities ===');
  await ensureEntitiesTable();

  let seeded = 0;
  let merged = 0;
  for (const entity of KNOWN_ENTITIES) {
    const existing = await findEntityByName(entity.name);
    const aliases = [...entity.aliases];
    const profile = {
      description: entity.zhHint || entity.enHint,
      is_known_entity: true,
    };

    const result = await upsertEntity(entity.name, {
      aliases,
      source: 'knowledge_base',
      entityType: 'person',
      profile,
      bumpMention: false,
    });

    if (!result) {
      console.error(`  failed to seed ${entity.name}`);
      continue;
    }

    if (existing && existing.source !== 'knowledge_base') {
      merged++;
      console.log(`  merged ${entity.name} (was ${existing.source})`);
    } else if (!existing) {
      seeded++;
      console.log(`  seeded ${entity.name}`);
    }
  }
  console.log(`seeded=${seeded}, merged=${merged}`);

  console.log('\n=== Phase 2: backfill entity_type for existing user_mentioned entities ===');
  const entitiesRes = await sql`
    SELECT id, name, source, entity_type, mention_count
    FROM darkroom_entities
    WHERE entity_type = 'person' AND mention_count = 0
  `;
  let backfilled = 0;
  for (const row of entitiesRes.rows as Array<{ id: number; name: string; source: string; entity_type: string; mention_count: number }>) {
    if (row.source === 'user_mentioned' && row.mention_count === 0) {
      await sql`
        UPDATE darkroom_entities
        SET mention_count = 1, last_mentioned_at = NOW()
        WHERE id = ${row.id}
      `;
      backfilled++;
    }
  }
  console.log(`backfilled mention_count=${backfilled}`);

  console.log('\n=== Phase 3: link existing source_identity memories ===');
  await ensureMemoriesTable();
  await ensureMemoryEntitiesTable();

  const identityMemories = await sql`
    SELECT id, content, source_identity, source_lang
    FROM darkroom_memories
    WHERE source_identity IS NOT NULL
    ORDER BY id ASC
  `;

  let linkedIdentities = 0;
  for (const row of identityMemories.rows as Array<{ id: number; content: string; source_identity: string; source_lang: string }>) {
    const isZh = row.source_lang === 'zh';
    if (!looksLikeName(row.source_identity, isZh)) {
      console.log(`  skip suspicious identity: ${row.source_identity}`);
      continue;
    }

    const entity = await upsertEntity(row.source_identity, {
      source: 'memory',
      entityType: 'person',
      profile: { is_user: true },
      bumpMention: false,
    });

    if (!entity) continue;

    await linkMemoryToEntities(row.id, [row.source_identity], {
      subjectName: row.source_identity,
      confidence: 0.95,
      source: 'memory',
    });
    linkedIdentities++;
  }
  console.log(`linked identity memories=${linkedIdentities}`);

  console.log('\n=== Phase 4: scan all memories for known entity mentions ===');
  const allEntities = await sql`
    SELECT id, name, aliases
    FROM darkroom_entities
  `;

  // Build a map of every possible mention -> canonical entity name.
  const mentionToCanonical = new Map<string, string>();
  for (const row of allEntities.rows as Array<{ id: number; name: string; aliases: string[] }>) {
    const canonical = row.name;
    mentionToCanonical.set(canonical.toLowerCase(), canonical);
    for (const alias of row.aliases || []) {
      mentionToCanonical.set(alias.toLowerCase(), canonical);
    }
  }

  const allMemories = await sql`
    SELECT id, content
    FROM darkroom_memories
    ORDER BY id ASC
  `;

  let scanned = 0;
  let linkedMentions = 0;
  const memoryRows = allMemories.rows as Array<{ id: number; content: string }>;
  const totalMemories = memoryRows.length;
  for (const row of memoryRows) {
    scanned++;
    if (scanned % 100 === 0) {
      console.log(`  scanned ${scanned}/${totalMemories}, linked ${linkedMentions}`);
    }

    const content = row.content || '';
    const matched = new Set<string>();
    for (const [mention, canonical] of mentionToCanonical) {
      if (mention.length < 2) continue;
      // Simple boundary-aware search for Chinese and English names.
      const escaped = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9一-龥])${escaped}($|[^a-zA-Z0-9一-龥])`, 'i');
      if (regex.test(content)) {
        matched.add(canonical);
      }
    }

    if (matched.size > 0) {
      await linkMemoryToEntities(row.id, Array.from(matched), {
        confidence: 0.75,
        source: 'memory',
      });
      linkedMentions++;
    }
  }
  console.log(`scanned memories=${scanned}, linked=${linkedMentions}`);

  console.log('\n=== Summary ===');
  const finalCounts = await sql`
    SELECT
      (SELECT COUNT(*) FROM darkroom_entities) AS entities,
      (SELECT COUNT(*) FROM darkroom_memory_entities) AS memory_links,
      (SELECT COUNT(*) FROM darkroom_entities WHERE source = 'knowledge_base') AS known_entities
  `;
  const counts = finalCounts.rows[0] as { entities: number; memory_links: number; known_entities: number };
  console.log(`total entities=${counts.entities}, knowledge_base=${counts.known_entities}, memory_links=${counts.memory_links}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
