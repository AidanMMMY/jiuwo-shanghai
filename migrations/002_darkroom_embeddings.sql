-- Migration: add vector embedding support to darkroom_memories.
-- This file assumes the default OpenAI text-embedding-3-small dimension (1536).
-- If you use a different model (e.g. SiliconFlow BAAI/bge-m3 with 1024 dims),
-- set DARKROOM_EMBEDDING_DIMENSIONS and run scripts/apply-darkroom-embedding-migration.ts instead.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE darkroom_memories
  DROP COLUMN IF EXISTS embedding;

ALTER TABLE darkroom_memories
  ADD COLUMN embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_darkroom_memories_embedding
  ON darkroom_memories USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
