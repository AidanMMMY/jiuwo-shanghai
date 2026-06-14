-- Migration: add vector embedding support to darkroom_memories
-- Run this manually in Neon console or via psql before deploying the new code.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE darkroom_memories
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_darkroom_memories_embedding
  ON darkroom_memories USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
