-- Migration: add memory metadata fields for quality classification and retrieval tracking.

ALTER TABLE darkroom_memories
  ADD COLUMN IF NOT EXISTS memory_type VARCHAR(32) NOT NULL DEFAULT 'user_fact',
  ADD COLUMN IF NOT EXISTS retrieval_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_darkroom_memories_type ON darkroom_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_darkroom_memories_last_retrieved ON darkroom_memories(last_retrieved_at);
